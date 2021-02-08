/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
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

type AlertFieldMappingAndValues = Record<
  string,
  { alertPath: string; values: Set<string>; sirFieldKey: string }
>;

const format: ExternalServiceFormatter<ExternalServiceParams>['format'] = (theCase, alerts) => {
  const {
    destIp = null,
    sourceIp = null,
    category = null,
    subcategory = null,
    malwareHash = null,
    malwareUrl = null,
    priority = null,
  } = (theCase.connector.fields as ConnectorServiceNowSIRTypeFields['fields']) ?? {};
  const alertFieldsVariables = [destIp, sourceIp, malwareHash, malwareUrl];

  // Set is used to avoid duplicates
  const alertFieldMappingAndValues: AlertFieldMappingAndValues = {
    destIp: { alertPath: 'destination.ip', values: new Set(), sirFieldKey: 'dest_ip' },
    sourceIp: { alertPath: 'source.ip', values: new Set(), sirFieldKey: 'source_ip' },
    malwareHash: { alertPath: 'file.hash.sha256', values: new Set(), sirFieldKey: 'malware_hash' },
    malwareUrl: { alertPath: 'url.full', values: new Set(), sirFieldKey: 'malware_url' },
  };

  if (alertFieldsVariables.some((field) => field != null)) {
    alerts.forEach((alert) => {
      Object.keys(alertFieldMappingAndValues).forEach((alertField) => {
        const field = get(alertFieldMappingAndValues[alertField].alertPath, alert);
        if (field) {
          alertFieldMappingAndValues[alertField].values.add(field);
        }
      });
    });
  }

  const alertFields = Object.keys(alertFieldMappingAndValues).reduce(
    (acc, field) => ({
      ...acc,
      [alertFieldMappingAndValues[field].sirFieldKey]:
        alertFieldMappingAndValues[field].values.size > 0
          ? Array.from(alertFieldMappingAndValues[field].values).join(',')
          : null,
    }),
    { dest_ip: null, source_ip: null, malware_hash: null, malware_url: null }
  );

  return {
    ...alertFields,
    category,
    subcategory,
    priority,
  };
};

export const serviceNowSIRExternalServiceFormatter: ExternalServiceFormatter<ExternalServiceParams> = {
  format,
};
