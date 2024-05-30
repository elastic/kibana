/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { createInvestigateServiceInventoryWidget } from '@kbn/apm-plugin/public';
import { InvestigateWidgetCreate, WorkflowBlock } from '@kbn/investigate-plugin/common';
import { useAbortableAsync } from '@kbn/observability-ai-assistant-plugin/public';
import { useKibana } from '../use_kibana';

export function useApmWorkflowBlock({
  start,
  end,
  onWidgetAdd,
}: {
  start: string;
  end: string;
  onWidgetAdd: (create: InvestigateWidgetCreate) => Promise<void>;
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

  return useMemo<WorkflowBlock>(() => {
    const id = 'apm';
    if (servicesResult.loading) {
      return {
        id,
        loading: true,
        content: i18n.translate('xpack.investigateApp.workflowBlocks.apm.loadingAlerts', {
          defaultMessage: 'Fetching services',
        }),
      };
    }

    if (servicesResult.error) {
      return {
        id,
        loading: false,
        content: i18n.translate('xpack.investigateApp.workflowBlocks.apm.failedLoadingServices', {
          defaultMessage: 'Failed to fetch services',
        }),
      };
    }

    const numServices = servicesResult.value?.terms.length;

    if (numServices === 0) {
      return {
        id,
        loading: false,
        color: 'success',
        content: i18n.translate('xpack.investigateApp.workflowBlocks.apm.noServices', {
          defaultMessage: 'No APM Services are reporting',
        }),
      };
    }

    return {
      id,
      loading: false,
      color: 'warning',
      content: i18n.translate('xpack.investigateApp.workflowBlocks.apm.viewServiceInventory', {
        defaultMessage: 'View service inventory',
      }),
      onClick: () => {
        onWidgetAddRef.current(
          createInvestigateServiceInventoryWidget({
            title: i18n.translate(
              'xpack.investigateApp.workflowBlocks.apm.serviceInventoryWidgetTitle',
              {
                defaultMessage: 'APM Service inventory',
              }
            ),
            parameters: {
              environment: 'ENVIRONMENT_ALL',
            },
          })
        );
      },
      description: i18n.translate('xpack.investigateApp.workflowBlocks.apm.numServicesReporting', {
        defaultMessage: '{numServices, plural, one {# service} other {# services}} reporting data',
        values: {
          numServices,
        },
      }),
    };
  }, [servicesResult]);
}
