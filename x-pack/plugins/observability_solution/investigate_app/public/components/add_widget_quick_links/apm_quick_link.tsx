/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { InvestigateWidgetCreate } from '@kbn/investigate-plugin/common';
import { useAbortableAsync } from '@kbn/observability-ai-assistant-plugin/public';
import React, { useMemo, useRef } from 'react';
import { createInvestigateServiceInventoryWidget } from '@kbn/apm-plugin/public';
import { AddWidgetQuickLink } from '.';
import { useKibana } from '../../hooks/use_kibana';

export function ApmQuickLink({
  onWidgetAdd,
  start,
  end,
}: {
  onWidgetAdd: (create: InvestigateWidgetCreate) => Promise<void>;
  start: string;
  end: string;
}) {
  const {
    dependencies: {
      start: {
        apm: { apiClient },
      },
    },
  } = useKibana();

  const onWidgetAddRef = useRef(onWidgetAdd);

  onWidgetAddRef.current = onWidgetAdd;

  const servicesResult = useAbortableAsync(
    ({ signal }) => {
      return apiClient('GET /internal/apm/suggestions', {
        params: {
          query: {
            fieldName: 'service.name',
            fieldValue: '',
            start,
            end,
          },
        },
        signal,
      });
    },
    [apiClient, start, end]
  );

  const quickLinkProps = useMemo<React.ComponentProps<typeof AddWidgetQuickLink>>(() => {
    if (servicesResult.loading) {
      return {
        loading: true,
        content: i18n.translate('xpack.investigateApp.apmQuickLink.loadingAlerts', {
          defaultMessage: 'Fetching services',
        }),
      };
    }

    if (servicesResult.error) {
      return {
        loading: false,
        content: i18n.translate('xpack.investigateApp.apmQuickLink.failedLoadingServices', {
          defaultMessage: 'Failed to fetch services',
        }),
      };
    }

    const numServices = servicesResult.value?.terms.length;

    if (numServices === 0) {
      return {
        loading: false,
        color: 'success',
        content: i18n.translate('xpack.investigateApp.apmQuickLink.noServices', {
          defaultMessage: 'No APM Services are reporting',
        }),
      };
    }

    return {
      loading: false,
      color: 'warning',
      content: i18n.translate('xpack.investigateApp.apmQuickLink.viewServiceInventory', {
        defaultMessage: 'View service inventory',
      }),
      onClick: () => {
        onWidgetAddRef.current(
          createInvestigateServiceInventoryWidget({
            title: i18n.translate('xpack.investigateApp.apmQuickLink.serviceInventoryWidgetTitle', {
              defaultMessage: 'APM Service inventory',
            }),
            parameters: {
              environment: 'ENVIRONMENT_ALL',
            },
          })
        );
      },
      description: i18n.translate('xpack.investigateApp.apmQuickLink.numServicesReporting', {
        defaultMessage: '{numServices, plural, one {# service} other {# services}} reporting data',
        values: {
          numServices,
        },
      }),
    };
  }, [servicesResult]);

  return <AddWidgetQuickLink {...quickLinkProps} />;
}
