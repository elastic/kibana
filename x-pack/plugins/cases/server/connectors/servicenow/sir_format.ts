/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash/fp';
import { ConnectorServiceNowSIRTypeFields } from '../../../common/api';
import { ServiceNowSIRFormat, SirFieldKey, AlertFieldMappingAndValues } from './types';

export const format: ServiceNowSIRFormat = (theCase, alerts) => {
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

  let sirFields: Record<SirFieldKey, string[]> = {
    dest_ip: [],
    source_ip: [],
    malware_hash: [],
    malware_url: [],
  };

  const fieldsToAdd = (Object.keys(alertFieldMapping) as SirFieldKey[]).filter(
    (key) => alertFieldMapping[key].add
  );

  if (fieldsToAdd.length > 0) {
    sirFields = alerts.reduce<Record<SirFieldKey, string[]>>((acc, alert) => {
      let temp = {};
      fieldsToAdd.forEach((alertField) => {
        const field = get(alertFieldMapping[alertField].alertPath, alert);

        if (field && !manageDuplicate[alertFieldMapping[alertField].sirFieldKey].has(field)) {
          manageDuplicate[alertFieldMapping[alertField].sirFieldKey].add(field);

          temp = {
            ...acc,
            ...temp,
            [alertFieldMapping[alertField].sirFieldKey]: [
              ...acc[alertFieldMapping[alertField].sirFieldKey],
              field,
            ],
          };
        }
      });

      return { ...acc, ...temp };
    }, sirFields);
  }

  return {
    ...sirFields,
    category,
    subcategory,
    priority,
    correlation_id: theCase.id ?? null,
    correlation_display: 'Elastic Case',
  };
};
