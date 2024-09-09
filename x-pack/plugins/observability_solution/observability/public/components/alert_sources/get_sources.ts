/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_GROUP_FIELD, ALERT_GROUP_VALUE, ALERT_GROUP } from '@kbn/rule-data-utils';
import { TopAlert } from '../../typings/alerts';
import { apmSources, infraSources } from './get_alert_source_links';

interface AlertFields {
  [key: string]: any;
}

export const getSources = (alert: TopAlert) => {
  // when `kibana.alert.group` is not flattened (for alert detail pages)
  if (alert.fields[ALERT_GROUP]) return alert.fields[ALERT_GROUP];

  // when `kibana.alert.group` is flattened (for alert flyout)
  const groupsFromGroupFields = alert.fields[ALERT_GROUP_FIELD]?.map((field, index) => {
    const values = alert.fields[ALERT_GROUP_VALUE];
    if (values?.length && values[index]) {
      return { field, value: values[index] };
    }
  });

  if (groupsFromGroupFields?.length) return groupsFromGroupFields;

  // Not all rules has group.fields, in that case we search in the alert fields.
  const matchedSources: Array<{ field: string; value: any }> = [];
  const ALL_SOURCES = [...infraSources, ...apmSources];
  const alertFields = alert.fields as AlertFields;
  ALL_SOURCES.forEach((source: string) => {
    Object.keys(alertFields).forEach((field: any) => {
      if (source === field) {
        const fieldValue = alertFields[field];
        matchedSources.push({
          field: source,
          value: Array.isArray(fieldValue) ? fieldValue[0] : fieldValue,
        });
      }
    });
  });

  return matchedSources;
};
