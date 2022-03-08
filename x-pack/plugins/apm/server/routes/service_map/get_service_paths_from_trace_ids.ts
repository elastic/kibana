/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, last } from 'lodash';
import {
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_SUBTYPE,
  SPAN_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { Span } from '../../../typings/es_schemas/ui/span';
import { Transaction } from '../../../typings/es_schemas/ui/transaction';
import { withApmSpan } from '../../utils/with_apm_span';
import { ServicePathsFromTraceIds } from './fetch_service_paths_from_trace_ids';

type DocType = keyof Pick<typeof ProcessorEvent, 'span' | 'transaction'>;

interface Location {
  [SERVICE_NAME]: string;
  [SERVICE_ENVIRONMENT]?: string;
  [AGENT_NAME]: string;
}

interface EventBase<TDocument, TDocType extends DocType> {
  doc: TDocument;
  docType: TDocType;
  path?: Location[];
}

export type EventSpan = EventBase<Span, 'span'>;
export type EventTransaction = EventBase<Transaction, 'transaction'>;

type Event = EventSpan | EventTransaction;

interface EventsById {
  [id: string]: Event;
}

export interface Context {
  processedEvents: EventsById;
  eventsById: EventsById;
  paths: Record<string, unknown>;
  externalToServiceMap: Record<
    string,
    { from: ReturnType<typeof getSpanDestination>; to: Location }
  >;
  locationsToRemove: Record<string, unknown>;
}

export function getEventsByIdMap(
  servicePathsFromTraceIds: ServicePathsFromTraceIds
) {
  return servicePathsFromTraceIds.reduce((acc, { _source: source }) => {
    // Only spans or transactions events
    if ('processor' in source) {
      if (source.processor.event === ProcessorEvent.transaction) {
        const transaction = source as Transaction;
        const eventTransaction: EventTransaction = {
          doc: transaction,
          docType: 'transaction',
        };
        return { ...acc, [transaction.transaction.id]: eventTransaction };
      }

      if (source.processor.event === ProcessorEvent.span) {
        const span = source as Span;
        const eventSpan: EventSpan = {
          doc: span,
          docType: 'span',
        };

        return { ...acc, [span.span.id]: eventSpan };
      }
    }

    return acc;
  }, {} as EventsById);
}

export function getServicePathsFromTraceIds({
  servicePathsFromTraceIds,
}: {
  servicePathsFromTraceIds: ServicePathsFromTraceIds;
}) {
  return withApmSpan('get_service_paths_fromt_trace_ids', async () => {
    const eventsByIdMap = getEventsByIdMap(servicePathsFromTraceIds);

    const context: Context = {
      processedEvents: {},
      eventsById: eventsByIdMap,
      paths: {},
      externalToServiceMap: {},
      locationsToRemove: {},
    };

    Object.keys(eventsByIdMap).forEach((id) => {
      return processAndReturnEvent({ context, id });
    });

    const paths: any[] = [];
    Object.keys(context.paths).forEach((key) => {
      if (!context.locationsToRemove[key]) {
        paths.push(context.paths[key]);
      }
    });

    return {
      paths,
      discoveredServices: Object.values(context.externalToServiceMap),
    };
  });
}

function getSpanDestination(span: Span) {
  return {
    [SPAN_DESTINATION_SERVICE_RESOURCE]:
      span.span.destination?.service.resource,
    [SPAN_TYPE]: span.span.type,
    [SPAN_SUBTYPE]: span.span.subtype,
  };
}

export function processAndReturnEvent({
  context,
  id,
}: {
  context: Context;
  id: string;
}) {
  if (context.processedEvents[id]) {
    return context.processedEvents[id];
  }

  const event = context.eventsById[id];
  if (!event) {
    return null;
  }

  const eventLocation: Location = {
    [SERVICE_NAME]: event.doc.service.name,
    [SERVICE_ENVIRONMENT]: event.doc.service.environment,
    [AGENT_NAME]: event.doc.agent.name,
  };

  const basePath: Location[] = [];
  const parentId = event.doc.parent?.id;
  let parentEvent;

  if (parentId && parentId !== id) {
    parentEvent = processAndReturnEvent({ context, id: parentId });
    if (parentEvent) {
      if (parentEvent.path) {
        // copy the path from the parent
        basePath.push(...parentEvent.path);
        // flag parent path for removal, as it has children
        context.locationsToRemove[JSON.stringify(parentEvent.path)] =
          parentEvent.path;
      }

      /* if the parent has 'span.destination.service.resource' set, 
         and the service is different, we've discovered a service */
      if (
        parentEvent.docType === ProcessorEvent.span &&
        parentEvent.doc.span.destination?.service.resource &&
        (parentEvent.doc.service.name !== event.doc.service.name ||
          parentEvent.doc.service.environment !== event.doc.service.environment)
      ) {
        const parentDestination = getSpanDestination(parentEvent.doc);
        const destination = { from: parentDestination, to: eventLocation };
        context.externalToServiceMap[JSON.stringify(destination)] = destination;
      }
    }
  }

  const lastLocation = last(basePath);
  // only add the current location to the path if it's different from the last one
  if (lastLocation === undefined || !isEqual(eventLocation, lastLocation)) {
    basePath.push(eventLocation);
  }
  // if there is an outgoing span, create a new path
  if (
    event.docType === ProcessorEvent.span &&
    event.doc.span.destination?.service.resource
  ) {
    const outgoingLocation = getSpanDestination(event.doc);
    const outgoingPath = [...basePath, outgoingLocation];
    context.paths[JSON.stringify(outgoingPath)] = outgoingPath;
  }

  event.path = basePath;

  context.processedEvents[id] = event;
  return event;
}
