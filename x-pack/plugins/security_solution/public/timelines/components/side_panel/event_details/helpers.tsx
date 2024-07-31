/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { some } from 'lodash/fp';
import { useMemo } from 'react';
import { getAlertDetailsFieldValue } from '../../../../common/lib/endpoint/utils/get_event_details_field_values';
import type { TimelineEventsDetailsItem } from '../../../../../common/search_strategy';
import { DEFAULT_ALERTS_INDEX, DEFAULT_PREVIEW_INDEX } from '../../../../../common/constants';

export interface GetBasicDataFromDetailsData {
  agentId?: string;
  alertId: string;
  alertUrl?: string;
  data: TimelineEventsDetailsItem[] | null;
  hostName: string;
  indexName?: string;
  isAlert: boolean;
  ruleDescription: string;
  ruleId: string;
  ruleName: string;
  timestamp: string;
  userName: string;
}

export const useBasicDataFromDetailsData = (
  data: TimelineEventsDetailsItem[] | null
): GetBasicDataFromDetailsData => {
  const isAlert = some({ category: 'kibana', field: 'kibana.alert.rule.uuid' }, data);

  const ruleId = useMemo(
    () =>
      isAlert
        ? getAlertDetailsFieldValue({ category: 'kibana', field: 'kibana.alert.rule.uuid' }, data)
        : getAlertDetailsFieldValue({ category: 'signal', field: 'signal.rule.id' }, data),
    [isAlert, data]
  );

  const ruleName = useMemo(
    () => getAlertDetailsFieldValue({ category: 'kibana', field: 'kibana.alert.rule.name' }, data),
    [data]
  );

  const ruleDescription = useMemo(
    () =>
      getAlertDetailsFieldValue(
        { category: 'kibana', field: 'kibana.alert.rule.description' },
        data
      ),
    [data]
  );

  const alertId = useMemo(
    () => getAlertDetailsFieldValue({ category: '_id', field: '_id' }, data),
    [data]
  );

  const indexName = useMemo(
    () => getAlertDetailsFieldValue({ category: '_index', field: '_index' }, data),
    [data]
  );

  const alertUrl = useMemo(
    () => getAlertDetailsFieldValue({ category: 'kibana', field: 'kibana.alert.url' }, data),
    [data]
  );

  const agentId = useMemo(
    () => getAlertDetailsFieldValue({ category: 'agent', field: 'agent.id' }, data),
    [data]
  );

  const hostName = useMemo(
    () => getAlertDetailsFieldValue({ category: 'host', field: 'host.name' }, data),
    [data]
  );

  const userName = useMemo(
    () => getAlertDetailsFieldValue({ category: 'user', field: 'user.name' }, data),
    [data]
  );

  const timestamp = useMemo(
    () => getAlertDetailsFieldValue({ category: 'base', field: '@timestamp' }, data),
    [data]
  );

  return useMemo(
    () => ({
      agentId,
      alertId,
      alertUrl,
      data,
      hostName,
      indexName,
      isAlert,
      ruleDescription,
      ruleId,
      ruleName,
      timestamp,
      userName,
    }),
    [
      agentId,
      alertId,
      alertUrl,
      data,
      hostName,
      indexName,
      isAlert,
      ruleDescription,
      ruleId,
      ruleName,
      timestamp,
      userName,
    ]
  );
};

/*
The referenced alert _index in the flyout uses the `.internal.` such as
`.internal.alerts-security.alerts-spaceId` in the alert page flyout and
.internal.preview.alerts-security.alerts-spaceId` in the rule creation preview flyout
but we always want to use their respective aliase indices rather than accessing their backing .internal. indices.
*/
export const getAlertIndexAlias = (
  index: string,
  spaceId: string = 'default'
): string | undefined => {
  if (index.startsWith(`.internal${DEFAULT_ALERTS_INDEX}`)) {
    return `${DEFAULT_ALERTS_INDEX}-${spaceId}`;
  } else if (index.startsWith(`.internal${DEFAULT_PREVIEW_INDEX}`)) {
    return `${DEFAULT_PREVIEW_INDEX}-${spaceId}`;
  }
};
