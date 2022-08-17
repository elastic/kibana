/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { some } from 'lodash/fp';
import { useMemo } from 'react';
import type { TimelineEventsDetailsItem } from '../../../../../common/search_strategy';
import { getFieldValue } from '../../../../detections/components/host_isolation/helpers';
import { DEFAULT_ALERTS_INDEX, DEFAULT_PREVIEW_INDEX } from '../../../../../common/constants';

interface GetBasicDataFromDetailsData {
  alertId: string;
  isAlert: boolean;
  hostName: string;
  ruleName: string;
  timestamp: string;
}

export const useBasicDataFromDetailsData = (
  data: TimelineEventsDetailsItem[] | null
): GetBasicDataFromDetailsData => {
  const isAlert = some({ category: 'kibana', field: 'kibana.alert.rule.uuid' }, data);

  const ruleName = useMemo(
    () => getFieldValue({ category: 'kibana', field: 'kibana.alert.rule.name' }, data),
    [data]
  );

  const alertId = useMemo(() => getFieldValue({ category: '_id', field: '_id' }, data), [data]);

  const hostName = useMemo(
    () => getFieldValue({ category: 'host', field: 'host.name' }, data),
    [data]
  );

  const timestamp = useMemo(
    () => getFieldValue({ category: 'base', field: '@timestamp' }, data),
    [data]
  );

  return useMemo(
    () => ({
      alertId,
      isAlert,
      hostName,
      ruleName,
      timestamp,
    }),
    [alertId, hostName, isAlert, ruleName, timestamp]
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
