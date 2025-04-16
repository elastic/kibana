/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  NodeProgressionEvent,
  NodeProgressionEventMeta,
} from '@kbn/wc-framework-types-common';
import type {
  WorkflowRunEventHandler,
  NodeEventReporter,
  NodeProgressionReporterEvent,
} from '@kbn/wc-framework-types-server';

export const createNoopNodeEventReporter = (): NodeEventReporter => {
  return {
    reportProgress: () => {},
  };
};

export const createNodeEventReporter = ({
  onEvent,
  meta,
}: {
  onEvent: WorkflowRunEventHandler;
  meta: NodeProgressionEventMeta;
}): NodeEventReporter => {
  return {
    reportProgress: (event) => {
      onEvent(convertNodeProgressionEvent({ event, meta }));
    },
  };
};

export const convertNodeProgressionEvent = ({
  event,
  meta,
}: {
  event: NodeProgressionReporterEvent;
  meta: NodeProgressionEventMeta;
}): NodeProgressionEvent => {
  return {
    eventType: 'node_progression',
    label: event.label,
    data: event.data,
    meta,
  };
};
