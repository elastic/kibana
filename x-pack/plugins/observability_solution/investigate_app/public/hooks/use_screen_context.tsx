/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_REASON, ALERT_START, ALERT_STATUS } from '@kbn/rule-data-utils';
import type { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common';
import dedent from 'dedent';
import { useEffect } from 'react';
import { useKibana } from './use_kibana';
import { useInvestigation } from '../pages/details/contexts/investigation_context';
import { useFetchAlert } from './use_fetch_alert';

export function useScreenContext() {
  const {
    dependencies: {
      start: { observabilityAIAssistant },
    },
  } = useKibana();

  const { investigation } = useInvestigation();
  const { data: alertDetails, isLoading: isAlertDetailsLoading } = useFetchAlert({ investigation });

  useEffect(() => {
    if (!investigation || isAlertDetailsLoading) {
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
        ...(alertDetails
          ? [
              {
                name: 'alert',
                description: 'The alert details that triggered the investigation.',
                value: alertDetails,
              },
            ]
          : []),
      ],
    });
  }, [observabilityAIAssistant, investigation, alertDetails, isAlertDetailsLoading]);
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
  `);
}
