/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertOriginSchema } from '@kbn/investigation-shared';
import { ALERT_REASON, ALERT_START, ALERT_STATUS } from '@kbn/rule-data-utils';
import type { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common';
import dedent from 'dedent';
import { omit } from 'lodash';
import { useEffect } from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import { useInvestigation } from '../contexts/investigation_context';
import { useFetchAlert } from './use_fetch_alert';

export function useScreenContext() {
  const {
    dependencies: {
      start: { observabilityAIAssistant },
    },
  } = useKibana();

  const { investigation } = useInvestigation();
  const alertOriginInvestigation = alertOriginSchema.safeParse(investigation?.origin);
  const alertId = alertOriginInvestigation.success ? alertOriginInvestigation.data.id : undefined;
  const { data: alertDetails } = useFetchAlert({ id: alertId });

  useEffect(() => {
    if (!investigation) {
      return;
    }

    observabilityAIAssistant.service.setScreenContext({
      screenDescription: dedent(`
        The user is looking at the details of an investigation in order to understand the root cause of an issue.
        The investigation details include the title, status, tags, and its time range.

        ${alertDetails ? getAlertDetailScreenContext(alertDetails) : ''}

        Title: ${investigation.title}
        Tags: ${investigation.tags.join(', ')}
        Status: ${investigation.status}
        Start time: ${new Date(investigation.params.timeRange.from).toISOString()}
        End time: ${new Date(investigation.params.timeRange.to).toISOString()}
      `),
      data: [
        {
          name: 'investigation',
          description: 'The investigation details, including metadata, notes and items.',
          value: investigation,
        },
      ],
    });
  }, [observabilityAIAssistant, investigation, alertDetails]);
}

function getAlertDetailScreenContext(alertDetail: EcsFieldsResponse) {
  const alertState = alertDetail[ALERT_STATUS];
  const alertStarted = alertDetail[ALERT_START];

  return dedent(`The investigation originates from an ${alertState} alert which started at ${alertStarted}.

  ${
    alertDetail[ALERT_REASON]
      ? `The reason given for the alert is ${alertDetail[ALERT_REASON]}.`
      : ''
  }

  Use the following alert fields to understand the context of the alert:
  ${Object.entries(getRelevantAlertFields(alertDetail))
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join('\n')}
  `);
}

function getRelevantAlertFields(alertDetail: EcsFieldsResponse) {
  return omit(alertDetail.fields, [
    'kibana.alert.rule.revision',
    'kibana.alert.rule.execution.uuid',
    'kibana.alert.flapping_history',
    'kibana.alert.uuid',
    'kibana.alert.rule.uuid',
    'event.action',
    'event.kind',
    'kibana.alert.rule.tags',
    'kibana.alert.maintenance_window_ids',
    'kibana.alert.consecutive_matches',
  ]);
}
