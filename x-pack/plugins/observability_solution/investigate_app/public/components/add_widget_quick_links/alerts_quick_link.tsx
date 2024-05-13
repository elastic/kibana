/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/alerts-ui-shared/src/common/constants';
import { i18n } from '@kbn/i18n';
import { InvestigateWidgetCreate } from '@kbn/investigate-plugin/common';
import { useAbortableAsync } from '@kbn/observability-ai-assistant-plugin/public';
import React, { useMemo } from 'react';
import { AddWidgetQuickLink } from '.';
import { useKibana } from '../../hooks/use_kibana';

export function AlertsQuickLink({
  onWidgetAdd,
}: {
  onWidgetAdd: (create: InvestigateWidgetCreate) => Promise<void>;
}) {
  const { core } = useKibana();

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
                      '@timestamp': {
                        gte: 'now-15m/m',
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
    [core.http]
  );

  const quickLinkProps = useMemo<React.ComponentProps<typeof AddWidgetQuickLink>>(() => {
    if (alertsResult.loading) {
      return {
        loading: true,
        content: i18n.translate('xpack.investigateApp.alertsQuickLink.loadingAlerts', {
          defaultMessage: 'Fetching open alerts',
        }),
      };
    }

    if (alertsResult.error) {
      return {
        loading: false,
        content: i18n.translate('xpack.investigateApp.alertsQuickLink.failedLoadingAlerts', {
          defaultMessage: 'Failed to retrieve open alerts',
        }),
      };
    }

    const numOpenAlerts = alertsResult.value?.hits.total.value;
    if (numOpenAlerts === 0) {
      return {
        loading: false,
        color: 'success',
        content: i18n.translate('xpack.investigateApp.alertsQuickLink.noOpenAlerts', {
          defaultMessage: 'No open alerts',
        }),
      };
    }

    return {
      loading: false,
      color: 'warning',
      content: i18n.translate('xpack.investigateApp.alertsQuickLink.investigateOpenAlertsAction', {
        defaultMessage: 'Investigate alerts',
      }),
      onClick: () => {},
      description: i18n.translate(
        'xpack.investigateApp.alertsQuickLink.investigateOpenAlertsDescription',
        {
          defaultMessage: '{numOpenAlerts, plural, one {# open alert} other {# open alerts}}',
          values: {
            numOpenAlerts,
          },
        }
      ),
    };
  }, [alertsResult]);

  return <AddWidgetQuickLink {...quickLinkProps} />;
}
