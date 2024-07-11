/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BASE_RAC_ALERTS_API_PATH } from '@kbn/alerts-ui-shared/src/common/constants';
import { useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/observability-ai-assistant-plugin/public';
import type { WorkflowBlock } from '@kbn/investigate-plugin/common';
import type { OnWidgetAdd } from '@kbn/investigate-plugin/public';
import { createInvestigateAlertsInventoryWidget } from '@kbn/observability-plugin/public';
import { ALERT_TIME_RANGE } from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import { useKibana } from '../use_kibana';

export function useAlertsWorkflowBlock({
  onWidgetAdd,
  start,
  end,
}: {
  onWidgetAdd: OnWidgetAdd;
  start: string;
  end: string;
}) {
  const { core } = useKibana();

  const onWidgetAddRef = useRef(onWidgetAdd);

  const alertsResult = useAbortableAsync(
    ({ signal }) => {
      return core.http.post<{ hits: { total: { value: number } } }>(
        `${BASE_RAC_ALERTS_API_PATH}/find`,
        {
          signal,
          body: JSON.stringify({
            size: 0,
            track_total_hits: true,
            query: {
              bool: {
                filter: [
                  {
                    range: {
                      [ALERT_TIME_RANGE]: {
                        gte: start,
                        lte: end,
                      },
                    },
                  },
                  {
                    term: {
                      'kibana.alert.status': 'active',
                    },
                  },
                ],
              },
            },
          }),
        }
      );
    },
    [core.http, start, end]
  );

  return useMemo<WorkflowBlock>(() => {
    const id = 'alerts';

    if (alertsResult.loading) {
      return {
        id,
        loading: true,
        content: i18n.translate('xpack.investigateApp.workflowBlocks.alerts.loadingAlerts', {
          defaultMessage: 'Fetching open alerts',
        }),
      };
    }

    if (alertsResult.error) {
      return {
        id,
        loading: false,
        content: i18n.translate('xpack.investigateApp.workflowBlocks.alerts.failedLoadingAlerts', {
          defaultMessage: 'Failed to retrieve open alerts',
        }),
      };
    }

    const numOpenAlerts = alertsResult.value?.hits.total.value;
    if (numOpenAlerts === 0) {
      return {
        id,
        loading: false,
        color: 'success',
        content: i18n.translate('xpack.investigateApp.workflowBlocks.alerts.noOpenAlerts', {
          defaultMessage: 'No open alerts',
        }),
      };
    }

    return {
      id,
      loading: false,
      color: 'warning',
      content: i18n.translate(
        'xpack.investigateApp.workflowBlocks.alerts.investigateOpenAlertsAction',
        {
          defaultMessage: 'Investigate alerts',
        }
      ),
      onClick: () => {
        onWidgetAddRef.current(
          createInvestigateAlertsInventoryWidget({
            title: i18n.translate(
              'xpack.investigateApp.workflowBlocks.alerts.activeAlertsWidgetTitle',
              { defaultMessage: 'Active alerts' }
            ),
            parameters: {
              activeOnly: true,
            },
          })
        );
      },
      description: i18n.translate(
        'xpack.investigateApp.workflowBlocks.alerts.investigateOpenAlertsDescription',
        {
          defaultMessage: '{numOpenAlerts, plural, one {# open alert} other {# open alerts}}',
          values: {
            numOpenAlerts,
          },
        }
      ),
    };
  }, [alertsResult]);
}
