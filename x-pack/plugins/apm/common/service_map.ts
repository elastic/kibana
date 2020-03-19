/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ILicense } from '../../licensing/public';

export interface ServiceConnectionNode {
  'service.name': string;
  'service.environment': string | null;
  'service.framework.name': string | null;
  'agent.name': string;
}
export interface ExternalConnectionNode {
  'destination.address': string;
  'span.type': string;
  'span.subtype': string;
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
  return (
    license.isActive &&
    (license.type === 'platinum' || license.type === 'trial')
  );
}

export const invalidLicenseMessage = i18n.translate(
  'xpack.apm.serviceMap.invalidLicenseMessage',
  {
    defaultMessage:
      "In order to access Service Maps, you must be subscribed to an Elastic Platinum license. With it, you'll have the ability to visualize your entire application stack along with your APM data."
  }
);
