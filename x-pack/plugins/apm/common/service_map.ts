/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ILicense } from '../../licensing/public';
import {
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_FRAMEWORK_NAME,
  SERVICE_NAME,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  SPAN_DESTINATION_SERVICE_RESOURCE,
} from './elasticsearch_fieldnames';

export interface ServiceConnectionNode {
  [SERVICE_NAME]: string;
  [SERVICE_ENVIRONMENT]: string | null;
  [SERVICE_FRAMEWORK_NAME]: string | null;
  [AGENT_NAME]: string;
}
export interface ExternalConnectionNode {
  [SPAN_DESTINATION_SERVICE_RESOURCE]: string;
  [SPAN_TYPE]: string;
  [SPAN_SUBTYPE]: string;
}

export type ConnectionNode = ServiceConnectionNode | ExternalConnectionNode;

export interface Connection {
  source: ConnectionNode;
  destination: ConnectionNode;
}

export interface ServiceNodeMetrics {
  numInstances: number;
  avgMemoryUsage: number | null;
  avgCpuUsage: number | null;
  avgTransactionDuration: number | null;
  avgRequestsPerMinute: number | null;
  avgErrorsPerMinute: number | null;
}

export function isValidPlatinumLicense(license: ILicense) {
  return license.isActive && license.hasAtLeast('platinum');
}

export const invalidLicenseMessage = i18n.translate(
  'xpack.apm.serviceMap.invalidLicenseMessage',
  {
    defaultMessage:
      "In order to access Service Maps, you must be subscribed to an Elastic Platinum license. With it, you'll have the ability to visualize your entire application stack along with your APM data.",
  }
);
