/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { sloListLocatorID } from '@kbn/observability-plugin/common';
import React from 'react';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useFetcher } from '../../../hooks/use_fetcher';

interface Props {
  serviceName: string;
}

export function ServiceSloBadge({ serviceName }: Props) {
  const {
    plugins: {
      share: {
        url: { locators },
      },
    },
  } = useApmPluginContext();

  const { data: sloCount = { slosCount: 0 } } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/services/{serviceName}/slos_count', {
        params: {
          path: {
            serviceName,
          },
        },
      });
    },
    [serviceName]
  );

  if (!sloCount.slosCount || sloCount.slosCount === 0) {
    return null;
  }

  const sloListLocator = locators.get(sloListLocatorID);
  const kqlQuery = `service.name: "${serviceName}" AND (status:"VIOLATED" OR status:"DEGRADING")`;

  const handleClick = () => {
    sloListLocator?.navigate({ kqlQuery }, { replace: false });
  };

  return (
    <EuiToolTip
      position="bottom"
      content={i18n.translate('xpack.apm.serviceOverview.sloBadgeTooltip', {
        defaultMessage: 'Violated Service Level Objectives',
      })}
    >
      <EuiBadge
        data-test-subj="apmServiceSloBadge"
        color="danger"
        tabIndex={0}
        onClick={handleClick}
        onClickAriaLabel={i18n.translate('xpack.apm.serviceOverview.sloBadgeAriaLabel', {
          defaultMessage: 'View {count} violated SLOs for {serviceName}',
          values: { count: sloCount.slosCount, serviceName },
        })}
        style={{ cursor: sloListLocator ? 'pointer' : 'default' }}
      >
        {i18n.translate('xpack.apm.serviceOverview.sloBadgeLabel', {
          defaultMessage: '{count} Violated',
          values: { count: sloCount.slosCount },
        })}
      </EuiBadge>
    </EuiToolTip>
  );
}
