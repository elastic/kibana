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

interface EventsById {
  [id: string]: (Span | Transaction) & { path?: Location[] };
}

interface Context {
  processedEvents: EventsById;
  eventsById: EventsById;
  paths: Record<string, unknown>;
  externalToServiceMap: Record<
    string,
    { from: ReturnType<typeof getSpanDestination>; to: Location }
  >;
  locationsToRemove: Record<string, unknown>;
}

export function getServicePathsFromTraceIds({
  servicePathsFromTraceIds,
}: {
  servicePathsFromTraceIds: ServicePathsFromTraceIds;
}) {
  return withApmSpan('get_service_paths_fromt_trace_ids', async () => {
    const eventsByIdMap = servicePathsFromTraceIds.reduce((acc, doc) => {
      const source = doc._source as Transaction | Span;
      const id =
        source.processor.event === ProcessorEvent.transaction
          ? (source as Transaction).transaction?.id
          : (source as Span).span.id;
      return { ...acc, [id]: source };
    }, {} as EventsById);

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

interface Location {
  [SERVICE_NAME]: string;
  [SERVICE_ENVIRONMENT]?: string;
  [AGENT_NAME]: string;
}

function processAndReturnEvent({
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
    [SERVICE_NAME]: event.service.name,
    [SERVICE_ENVIRONMENT]: event.service.environment,
    [AGENT_NAME]: event.agent.name,
  };

  const basePath: Location[] = [];
  const parentId = event.parent?.id;
  let parent;

  if (parentId && parentId !== id) {
    parent = processAndReturnEvent({ context, id: parentId });
    if (parent) {
      if (parent.path) {
        basePath.push(...parent.path);
        context.locationsToRemove[JSON.stringify(parent.path)] = parent.path;
      }

      if (
        parent.processor.event === ProcessorEvent.span &&
        (parent as Span).span.destination?.service.resource &&
        (parent.service.name !== event.service.name ||
          parent.service.environment !== event.service.environment)
      ) {
        const parentDestination = getSpanDestination(parent as Span);
        const destination = { from: parentDestination, to: eventLocation };
        context.externalToServiceMap[JSON.stringify(destination)] = destination;
      }
    }
  }

  const lastLocation = last(basePath);

  if (lastLocation === undefined || !isEqual(eventLocation, lastLocation)) {
    basePath.push(eventLocation);
  }

  if (
    event.processor.event === ProcessorEvent.span &&
    (event as Span).span.destination?.service.resource
  ) {
    const outgoingLocation = getSpanDestination(event as Span);
    const outgoingPath = [...basePath, outgoingLocation];
    context.paths[JSON.stringify(outgoingPath)] = outgoingPath;
  }

  event.path = basePath;

  context.processedEvents[id] = event;
  return event;
}
