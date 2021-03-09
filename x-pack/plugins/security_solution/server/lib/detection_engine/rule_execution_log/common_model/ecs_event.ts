/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEvent as IEventLogEvent } from '../../../../../../event_log/server';

// https://www.elastic.co/guide/en/ecs/1.9/ecs-guidelines.html
// https://www.elastic.co/guide/en/ecs/1.9/ecs-category-field-values-reference.html
// https://www.elastic.co/guide/en/ecs/1.9/ecs-field-reference.html

export type IEcsEvent = IEventLogEvent & IEcsAdditionalFields;

interface IEcsAdditionalFields {
  // https://www.elastic.co/guide/en/ecs/1.9/ecs-event.html
  event?: {
    dataset?: string;
    created?: string;
    kind?: string;
    type?: string[];
    severity?: number;
    sequence?: number;
  };

  // https://www.elastic.co/guide/en/ecs/1.9/ecs-log.html
  log?: {
    logger?: string;
    level?: string;
  };

  // https://www.elastic.co/guide/en/ecs/1.9/ecs-rule.html
  rule?: {
    id?: string;
  };

  // custom fields
  kibana?: {
    detection_engine?: {
      rule_status?: string;
      rule_status_severity?: number;
    };
  };
}

export type EcsEventKey = keyof IEcsEvent;
export type EcsEventBaseKey = '@timestamp' | 'message' | 'tags';
export type EcsEventObjectKey = Exclude<EcsEventKey, EcsEventBaseKey>;
