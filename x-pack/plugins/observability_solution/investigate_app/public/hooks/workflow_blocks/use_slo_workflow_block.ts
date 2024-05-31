/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useRef } from 'react';
import { useAbortableAsync } from '@kbn/observability-ai-assistant-plugin/public';
import { i18n } from '@kbn/i18n';
import { WorkflowBlock } from '@kbn/investigate-plugin/common';
import type { OnWidgetAdd } from '@kbn/investigate-plugin/public';
import { createInvestigateSloInventoryWidget } from '@kbn/slo-plugin/public';
import { useKibana } from '../use_kibana';

export function useSloWorkflowBlock({
  setFlyout,
  onWidgetAdd,
}: {
  setFlyout: React.Dispatch<React.SetStateAction<React.ReactNode>>;
  onWidgetAdd: OnWidgetAdd;
}) {
  const {
    dependencies: {
      start: { slo },
    },
  } = useKibana();

  const onWidgetAddRef = useRef(onWidgetAdd);

  onWidgetAddRef.current = onWidgetAdd;

  const sloResult = useAbortableAsync(
    ({ signal }) => {
      return slo.apiClient('GET /api/observability/slos 2023-10-31', {
        signal,
      });
    },
    [slo]
  );

  const sloWorkflowBlock = useMemo<WorkflowBlock>(() => {
    const isLoading = sloResult.loading;
    const isError = !!sloResult.error;

    const id = 'slo';

    if (isLoading) {
      return {
        id,
        loading: true,
        content: i18n.translate('xpack.investigateApp.workflowBlocks.slo.loadingSlos', {
          defaultMessage: 'Fetching SLOs',
        }),
      };
    }

    if (isError) {
      return {
        id,
        color: 'danger',
        loading: false,
        content: i18n.translate('xpack.investigateApp.workflowBlocks.slo.errorLoadingSlos', {
          defaultMessage: 'Error loading SLOs',
        }),
      };
    }

    const results = sloResult.value?.results ?? [];

    if (!results.length) {
      return {
        id,
        loading: false,
        content: i18n.translate('xpack.investigateApp.workflowBlocks.slo.slosEmptyAction', {
          defaultMessage: 'Set up a Service Level Objective',
        }),
        description: i18n.translate(
          'xpack.investigateApp.workflowBlocks.slo.slosEmptyDescription',
          {
            defaultMessage: "You don't have any SLOs yet",
          }
        ),
        onClick: () => {
          setFlyout(() => {
            return slo.getCreateSLOFlyout({
              onClose: () => {
                sloResult.refresh();
                setFlyout(() => undefined);
              },
            });
          });
        },
      };
    }

    const unhealthySlos = results.filter((result) => result.summary.status !== 'HEALTHY');

    const isOk = unhealthySlos.length === 0;

    return {
      id,
      color: isOk ? 'success' : 'warning',
      loading: false,
      content: i18n.translate('xpack.investigateApp.workflowBlocks.slo.investigateSlos', {
        defaultMessage: 'Investigate SLOs',
      }),
      description: i18n.translate('xpack.investigateApp.workflowBlocks.slo.unhealthySlos', {
        defaultMessage: `{numUnhealthy, plural, one {# unhealthy SLO} other {# unhealthy SLOs}}`,
        values: {
          numUnhealthy: unhealthySlos.length,
        },
      }),
      onClick: () => {
        onWidgetAddRef.current(
          createInvestigateSloInventoryWidget({
            title: i18n.translate('xpack.investigateApp.workflowBlocks.slo.inventoryWidgetTitle', {
              defaultMessage: 'Violating SLOs',
            }),
            parameters: {},
          })
        );
      },
    };
  }, [sloResult, slo, setFlyout]);

  return sloWorkflowBlock;
}
