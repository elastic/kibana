/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';

export const isInvestigateInResolverActionEnabled = (ecsData?: Ecs) =>
  (get(['agent', 'type', 0], ecsData) === 'endpoint' ||
    (get(['agent', 'type', 0], ecsData) === 'winlogbeat' &&
      get(['event', 'module', 0], ecsData) === 'sysmon')) &&
  get(['process', 'entity_id'], ecsData)?.length === 1 &&
  get(['process', 'entity_id', 0], ecsData) !== '';
