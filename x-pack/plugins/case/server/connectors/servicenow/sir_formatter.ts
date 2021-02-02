/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConnectorServiceNowSIRTypeFields } from '../../../common/api';
import { ExternalServiceFormatter } from '../types';

interface ExternalServiceParams {
  dest_ip: string | null;
  source_ip: string | null;
  category: string | null;
  subcategory: string | null;
  malware_hash: string | null;
  malware_url: string | null;
  priority: string | null;
}

const format: ExternalServiceFormatter<ExternalServiceParams>['format'] = async (
  theCase,
  alerts
) => {
  const {
    destIp = null,
    sourceIp = null,
    category = null,
    subcategory = null,
    malwareHash = null,
    malwareUrl = null,
    priority = null,
  } = (theCase.connector.fields as ConnectorServiceNowSIRTypeFields['fields']) ?? {};

  // Set to avoid duplicates
  const destinationIps = new Set();
  const sourceIps = new Set();

  if (destIp != null || sourceIp != null) {
    alerts.forEach((alert) => {
      if (alert.destination) {
        destinationIps.add(alert.destination.ip);
      }

      if (alert.source) {
        sourceIps.add(alert.source.ip);
      }
    });
  }

  return {
    dest_ip: destinationIps.size > 0 ? Array.from(destinationIps).join(',') : null,
    source_ip: sourceIps.size > 0 ? Array.from(sourceIps).join(',') : null,
    category,
    subcategory,
    malware_hash: malwareHash,
    malware_url: malwareUrl,
    priority,
  };
};

export const serviceNowSIRExternalServiceFormatter: ExternalServiceFormatter<ExternalServiceParams> = {
  format,
};
