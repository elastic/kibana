/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash/fp';
import { ConnectorServiceNowSIRTypeFields } from '../../../common';
import { Alert } from '../../services/alerts/types';
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
      if (isInvalid(alert)) {
        return acc;
      }

      return accumulateFieldsFromAlert({
        accumulatedFields: acc,
        alert,
        fieldsToAdd,
        dedupFields: manageDuplicate,
        alertFieldMapping,
      });
    }, sirFields);
  }

  return {
    ...sirFields,
    category,
    subcategory,
    priority,
  };
};

function isInvalid(alert: Alert) {
  return alert.error || alert.source == null;
}

function accumulateFieldsFromAlert({
  accumulatedFields,
  alert,
  fieldsToAdd,
  dedupFields,
  alertFieldMapping,
}: {
  accumulatedFields: Record<SirFieldKey, string | null>;
  alert: Alert;
  fieldsToAdd: SirFieldKey[];
  dedupFields: Record<SirFieldKey, Set<string>>;
  alertFieldMapping: AlertFieldMappingAndValues;
}) {
  fieldsToAdd.forEach((alertField) => {
    const field = get(alertFieldMapping[alertField].alertPath, alert.source);
    if (field && !dedupFields[alertFieldMapping[alertField].sirFieldKey].has(field)) {
      dedupFields[alertFieldMapping[alertField].sirFieldKey].add(field);
      accumulatedFields = {
        ...accumulatedFields,
        [alertFieldMapping[alertField].sirFieldKey]: `${
          accumulatedFields[alertFieldMapping[alertField].sirFieldKey] != null
            ? `${accumulatedFields[alertFieldMapping[alertField].sirFieldKey]},${field}`
            : field
        }`,
      };
    }
  });

  return accumulatedFields;
}
