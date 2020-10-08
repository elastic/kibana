/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { Logger } from 'src/core/server';
import { merge } from 'lodash';

import { Plugin } from './plugin';
import { EsContext } from './es';
import { EventLogService } from './event_log_service';
import {
  IEvent,
  IValidatedEvent,
  IEventLogger,
  IEventLogService,
  ECS_VERSION,
  EventSchema,
} from './types';
import { SAVED_OBJECT_REL_PRIMARY } from './types';

type SystemLogger = Plugin['systemLogger'];

interface Doc {
  index: string;
  body: IEvent;
}

interface IEventLoggerCtorParams {
  esContext: EsContext;
  eventLogService: EventLogService;
  initialProperties: IEvent;
  systemLogger: SystemLogger;
}

export class EventLogger implements IEventLogger {
  private esContext: EsContext;
  private eventLogService: EventLogService;
  private initialProperties: IEvent;
  private systemLogger: SystemLogger;

  constructor(ctorParams: IEventLoggerCtorParams) {
    this.esContext = ctorParams.esContext;
    this.eventLogService = ctorParams.eventLogService;
    this.initialProperties = ctorParams.initialProperties;
    this.systemLogger = ctorParams.systemLogger;
  }

  startTiming(event: IEvent): void {
    if (event == null) return;
    event.event = event.event || {};

    event.event.start = new Date().toISOString();
  }

  stopTiming(event: IEvent): void {
    if (event?.event == null) return;

    const start = getEventStart(event);
    if (start == null || isNaN(start)) return;

    const end = Date.now();
    event.event.end = new Date(end).toISOString();
    event.event.duration = (end - start) * 1000 * 1000; // nanoseconds
  }

  // non-blocking, but spawns an async task to do the work
  logEvent(eventProperties: IEvent): void {
    if (!this.eventLogService.isEnabled()) return;

    const event: IEvent = {};
    const fixedProperties = {
      '@timestamp': new Date().toISOString(),
      ecs: {
        version: ECS_VERSION,
      },
      kibana: {
        server_uuid: this.eventLogService.kibanaUUID,
      },
    };

    // merge the initial properties and event properties
    merge(event, this.initialProperties, eventProperties, fixedProperties);

    let validatedEvent: IValidatedEvent;
    try {
      validatedEvent = validateEvent(this.eventLogService, event);
    } catch (err) {
      this.systemLogger.warn(`invalid event logged: ${err.message}`);
      return;
    }

    const doc: Doc = {
      index: this.esContext.esNames.alias,
      body: validatedEvent,
    };

    if (this.eventLogService.isIndexingEntries()) {
      indexEventDoc(this.esContext, doc);
    }

    if (this.eventLogService.isLoggingEntries()) {
      logEventDoc(this.systemLogger, doc);
    }
  }
}

// return the epoch millis of the start date, or null; may be NaN if garbage
function getEventStart(event: IEvent): number | null {
  if (event?.event?.start == null) return null;

  return Date.parse(event.event.start);
}

const RequiredEventSchema = schema.object({
  provider: schema.string({ minLength: 1 }),
  action: schema.string({ minLength: 1 }),
});

const ValidSavedObjectRels = new Set([undefined, SAVED_OBJECT_REL_PRIMARY]);

function validateEvent(eventLogService: IEventLogService, event: IEvent): IValidatedEvent {
  if (event?.event == null) {
    throw new Error(`no "event" property`);
  }

  // ensure there are provider/action properties in event as strings
  const requiredProps = {
    provider: event.event.provider,
    action: event.event.action,
  };

  // will throw an error if structure doesn't validate
  const { provider, action } = RequiredEventSchema.validate(requiredProps);

  if (!eventLogService.isProviderActionRegistered(provider, action)) {
    throw new Error(`unregistered provider/action: "${provider}" / "${action}"`);
  }

  // could throw an error
  const result = EventSchema.validate(event);

  if (result?.kibana?.saved_objects?.length) {
    for (const so of result?.kibana?.saved_objects) {
      if (!ValidSavedObjectRels.has(so.rel)) {
        throw new Error(`invalid rel property in saved_objects: "${so.rel}"`);
      }
    }
  }

  return result;
}

export const EVENT_LOGGED_PREFIX = `event logged: `;

function logEventDoc(logger: Logger, doc: Doc): void {
  setImmediate(() => {
    logger.info(`${EVENT_LOGGED_PREFIX}${JSON.stringify(doc.body)}`);
  });
}

function indexEventDoc(esContext: EsContext, doc: Doc): void {
  // TODO:
  // the setImmediate() on an async function is a little overkill, but,
  // setImmediate() may be tweakable via node params, whereas async
  // tweaking is in the v8 params realm, which is very dicey.
  // Long-term, we should probably create an in-memory queue for this, so
  // we can explictly see/set the queue lengths.

  // already verified this.clusterClient isn't null above
  setImmediate(async () => {
    try {
      await indexLogEventDoc(esContext, doc);
    } catch (err) {
      esContext.logger.warn(`error writing event doc: ${err.message}`);
      writeLogEventDocOnError(esContext, doc);
    }
  });
}

// whew, the thing that actually writes the event log document!
async function indexLogEventDoc(esContext: EsContext, doc: unknown) {
  esContext.logger.debug(`writing to event log: ${JSON.stringify(doc)}`);
  const success = await esContext.waitTillReady();
  if (!success) {
    esContext.logger.debug(`event log did not initialize correctly, event not written`);
    return;
  }

  await esContext.esAdapter.indexDocument(doc);
  esContext.logger.debug(`writing to event log complete`);
}

// TODO: write log entry to a bounded queue buffer
function writeLogEventDocOnError(esContext: EsContext, doc: unknown) {
  esContext.logger.warn(`unable to write event doc: ${JSON.stringify(doc)}`);
}
