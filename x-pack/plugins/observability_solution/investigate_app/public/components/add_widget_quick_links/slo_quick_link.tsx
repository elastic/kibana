/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { useAbortableAsync } from '@kbn/observability-ai-assistant-plugin/public';
import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { InvestigateWidgetCreate } from '@kbn/investigate-plugin/common';
import { AddWidgetQuickLink } from '.';
import { useKibana } from '../../hooks/use_kibana';

export function SloQuickLink({
  onWidgetAdd,
}: {
  onWidgetAdd: (createOptions: InvestigateWidgetCreate) => Promise<void>;
}) {
  const {
    dependencies: {
      start: { slo },
    },
  } = useKibana();

  const sloResult = useAbortableAsync(
    ({ signal }) => {
      return slo.apiClient('GET /api/observability/slos 2023-10-31', {
        signal,
      });
    },
    [slo]
  );

  const [flyout, setFlyout] = useState<React.ReactNode>();

  const sloQuickLinkProps = useMemo<React.ComponentProps<typeof AddWidgetQuickLink>>(() => {
    const isLoading = sloResult.loading;
    const isError = !!sloResult.error;

    if (isLoading) {
      return {
        loading: true,
        content: i18n.translate('xpack.investigateApp.addWidgetQuickLinks.loadingSlos', {
          defaultMessage: 'Fetching SLOs',
        }),
      };
    }

    if (isError) {
      return {
        color: 'danger',
        loading: false,
        content: i18n.translate('xpack.investigateApp.addWidgetQuickLinks.errorLoadingSlos', {
          defaultMessage: 'Error loading SLOs',
        }),
      };
    }

    const results = sloResult.value?.results ?? [];

    if (!results.length) {
      return {
        loading: false,
        content: i18n.translate('xpack.investigateApp.addWidgetQuickLinks.slosEmptyAction', {
          defaultMessage: 'Set up a Service Level Objective',
        }),
        description: i18n.translate(
          'xpack.investigateApp.addWidgetQuickLinks.slosEmptyDescription',
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
      color: isOk ? 'success' : 'warning',
      loading: false,
      content: i18n.translate('xpack.investigateApp.addWidgetQuickLinks.investigateSlos', {
        defaultMessage: 'Investigate SLOs',
      }),
      description: i18n.translate('xpack.investigateApp.addWidgetQuickLinks.unhealthySlos', {
        defaultMessage: `{numUnhealthy, plural, one {# unhealthy SLO} other {# unhealthy SLOs}}`,
        values: {
          numUnhealthy: unhealthySlos.length,
        },
      }),
    };
  }, [sloResult, slo]);

  return (
    <AddWidgetQuickLink {...sloQuickLinkProps}>
      {flyout ? <div style={{ display: 'none' }}>{flyout}</div> : null}
    </AddWidgetQuickLink>
  );
}
