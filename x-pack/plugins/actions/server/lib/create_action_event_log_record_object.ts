/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, set } from 'lodash';
import { IEvent, SAVED_OBJECT_REL_PRIMARY } from '@kbn/event-log-plugin/server';
import { RelatedSavedObjects } from './related_saved_objects';

export type Event = Exclude<IEvent, undefined>;

interface CreateActionEventLogRecordParams {
  actionId: string;
  action: string;
  actionExecutionId: string;
  name?: string;
  message?: string;
  namespace?: string;
  timestamp?: string;
  spaceId?: string;
  consumer?: string;
  task?: {
    scheduled?: string;
    scheduleDelay?: number;
  };
  executionId?: string;
  savedObjects: Array<{
    type: string;
    id: string;
    typeId: string;
    relation?: string;
  }>;
  relatedSavedObjects?: RelatedSavedObjects;
  isPreconfigured?: boolean;
}

export function createActionEventLogRecordObject(params: CreateActionEventLogRecordParams): Event {
  const {
    action,
    message,
    task,
    namespace,
    executionId,
    spaceId,
    consumer,
    relatedSavedObjects,
    name,
    actionExecutionId,
    isPreconfigured,
  } = params;

  const kibanaAlertRule = {
    ...(consumer ? { consumer } : {}),
    ...(executionId
      ? {
          execution: {
            uuid: executionId,
          },
        }
      : {}),
  };

  const event: Event = {
    ...(params.timestamp ? { '@timestamp': params.timestamp } : {}),
    event: {
      action,
      kind: 'action',
    },
    kibana: {
      ...(!isEmpty(kibanaAlertRule) ? { alert: { rule: kibanaAlertRule } } : {}),
      saved_objects: params.savedObjects.map((so) => ({
        ...(so.relation ? { rel: so.relation } : {}),
        type: so.type,
        id: so.id,
        type_id: so.typeId,
        // set space_agnostic to true for preconfigured connectors
        ...(so.type === 'action' && isPreconfigured ? { space_agnostic: isPreconfigured } : {}),
        ...(namespace ? { namespace } : {}),
      })),
      ...(spaceId ? { space_ids: [spaceId] } : {}),
      ...(task ? { task: { scheduled: task.scheduled, schedule_delay: task.scheduleDelay } } : {}),
      action: {
        ...(name ? { name } : {}),
        execution: {
          uuid: actionExecutionId,
        },
      },
    },
    ...(message ? { message } : {}),
  };

  for (const relatedSavedObject of relatedSavedObjects || []) {
    const ruleTypeId = relatedSavedObject.type === 'alert' ? relatedSavedObject.typeId : null;
    if (ruleTypeId) {
      set(event, 'kibana.alert.rule.rule_type_id', ruleTypeId);
    }
    event.kibana?.saved_objects?.push({
      rel: SAVED_OBJECT_REL_PRIMARY,
      type: relatedSavedObject.type,
      id: relatedSavedObject.id,
      type_id: relatedSavedObject.typeId,
      namespace: relatedSavedObject.namespace,
    });
  }
  return event;
}
