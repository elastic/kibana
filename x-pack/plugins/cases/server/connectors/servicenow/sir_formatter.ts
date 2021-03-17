/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash/fp';
import { ConnectorServiceNowSIRTypeFields } from '../../../common';
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
type SirFieldKey = 'dest_ip' | 'source_ip' | 'malware_hash' | 'malware_url';
type AlertFieldMappingAndValues = Record<
  string,
  { alertPath: string; sirFieldKey: SirFieldKey; add: boolean }
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
  const alertFieldMapping: AlertFieldMappingAndValues = {
    destIp: { alertPath: 'destination.ip', sirFieldKey: 'dest_ip', add: !!destIp },
    sourceIp: { alertPath: 'source.ip', sirFieldKey: 'source_ip', add: !!sourceIp },
    malwareHash: { alertPath: 'file.hash.sha256', sirFieldKey: 'malware_hash', add: !!malwareHash },
    malwareUrl: { alertPath: 'url.full', sirFieldKey: 'malware_url', add: !!malwareUrl },
  };

  const manageDuplicate: Record<SirFieldKey, Set<string>> = {
    dest_ip: new Set(),
    source_ip: new Set(),
    malware_hash: new Set(),
    malware_url: new Set(),
  };

  let sirFields: Record<SirFieldKey, string | null> = {
    dest_ip: null,
    source_ip: null,
    malware_hash: null,
    malware_url: null,
  };

  const fieldsToAdd = (Object.keys(alertFieldMapping) as SirFieldKey[]).filter(
    (key) => alertFieldMapping[key].add
  );

  if (fieldsToAdd.length > 0) {
    sirFields = alerts.reduce<Record<SirFieldKey, string | null>>((acc, alert) => {
      fieldsToAdd.forEach((alertField) => {
        const field = get(alertFieldMapping[alertField].alertPath, alert);
        if (field && !manageDuplicate[alertFieldMapping[alertField].sirFieldKey].has(field)) {
          manageDuplicate[alertFieldMapping[alertField].sirFieldKey].add(field);
          acc = {
            ...acc,
            [alertFieldMapping[alertField].sirFieldKey]: `${
              acc[alertFieldMapping[alertField].sirFieldKey] != null
                ? `${acc[alertFieldMapping[alertField].sirFieldKey]},${field}`
                : field
            }`,
          };
        }
      });
      return acc;
    }, sirFields);
  }

  return {
    ...sirFields,
    category,
    subcategory,
    priority,
  };
};
export const serviceNowSIRExternalServiceFormatter: ExternalServiceFormatter<ExternalServiceParams> = {
  format,
};
