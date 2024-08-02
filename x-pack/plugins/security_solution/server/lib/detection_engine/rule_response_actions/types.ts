/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import type { ResponseActionsRequestBody } from '../../../../common/api/endpoint';
import type { CommonResponseActionMethodOptions } from '../../../endpoint/services';

export type Alert = ParsedTechnicalFields & {
  _id: string;
  _index: string;
  agent?: AlertAgent;
  host?: {
    name: string;
  };
  process?: {
    pid: string;
  };
};

export interface AlertAgent {
  id: string;
  name: string;
  type: string;
}

export interface AlertWithAgent extends Alert {
  agent: AlertAgent;
}

export interface ResponseActionAlerts {
  alerts: AlertWithAgent[];
}

export type AlertsAction = Pick<
  ResponseActionsRequestBody,
  'alert_ids' | 'endpoint_ids' | 'parameters'
> &
  Pick<CommonResponseActionMethodOptions, 'error' | 'hosts'>;
