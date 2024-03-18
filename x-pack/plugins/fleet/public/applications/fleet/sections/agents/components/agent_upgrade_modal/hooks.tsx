/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState, useMemo } from 'react';
import moment from 'moment';

import {
  AGENTS_PREFIX,
  FLEET_SERVER_PACKAGE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
} from '../../../../../../constants';

import { sendGetAgents, sendGetPackagePolicies } from '../../../../../../hooks';

export function useScheduleDateTime(now?: string) {
  const initialDatetime = useMemo(() => moment(now), [now]);
  const [startDatetime, setStartDatetime] = useState<moment.Moment>(initialDatetime);
  const minTime = useMemo(() => {
    if (startDatetime.isSame(initialDatetime, 'day')) {
      return initialDatetime.clone();
    }
  }, [startDatetime, initialDatetime]);
  const maxTime = useMemo(() => {
    if (startDatetime.isSame(initialDatetime, 'day')) {
      return initialDatetime.clone().endOf('day');
    }
  }, [startDatetime, initialDatetime]);

  const onChangeStartDateTime = useCallback(
    (date: moment.Moment | null) => {
      if (!date) {
        return;
      }

      if (date.isBefore(initialDatetime)) {
        setStartDatetime(initialDatetime);
      } else {
        setStartDatetime(date);
      }
    },
    [initialDatetime]
  );

  return {
    startDatetime,
    initialDatetime,
    onChangeStartDateTime,
    minTime,
    maxTime,
  };
}

export async function sendAllFleetServerAgents() {
  const packagePoliciesRes = await sendGetPackagePolicies({
    page: 1,
    perPage: SO_SEARCH_LIMIT,
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${FLEET_SERVER_PACKAGE}`,
  });
  const agentPolicyIds = [
    ...new Set(packagePoliciesRes?.data?.items.map((p) => p.policy_id) ?? []),
  ];

  if (agentPolicyIds.length === 0) {
    return { allFleetServerAgents: [] };
  }
  const kuery = `${AGENTS_PREFIX}.policy_id:${agentPolicyIds.map((id) => `"${id}"`).join(' or ')}`;

  const response = await sendGetAgents({
    kuery,
    perPage: SO_SEARCH_LIMIT,
    showInactive: false,
  });

  return { allFleetServerAgents: response.data?.items || [] };
}
