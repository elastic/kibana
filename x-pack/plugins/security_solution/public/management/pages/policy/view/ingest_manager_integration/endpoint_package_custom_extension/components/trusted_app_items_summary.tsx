/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiBadgeProps, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React, { FC, memo, useEffect, useState } from 'react';
import { CoreStart } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../../../../../../../../src/plugins/kibana_react/public';
import { TrustedAppsHttpService } from '../../../../../trusted_apps/service';
import { GetTrustedAppsSummaryResponse } from '../../../../../../../../common/endpoint/types';

const SUMMARY_KEYS: Readonly<Array<keyof GetTrustedAppsSummaryResponse>> = [
  'windows',
  'macos',
  'linux',
  'total',
];

const SUMMARY_LABELS: Readonly<{ [key in keyof GetTrustedAppsSummaryResponse]: string }> = {
  windows: i18n.translate(
    'xpack.securitySolution.endpoint.fleetCustomExtension.trustedAppItemsSummary.windows',
    { defaultMessage: 'Windows' }
  ),
  linux: i18n.translate(
    'xpack.securitySolution.endpoint.fleetCustomExtension.trustedAppItemsSummary.linux',
    { defaultMessage: 'Linux' }
  ),
  macos: i18n.translate(
    'xpack.securitySolution.endpoint.fleetCustomExtension.trustedAppItemsSummary.macos',
    { defaultMessage: 'Mac' }
  ),
  total: i18n.translate(
    'xpack.securitySolution.endpoint.fleetCustomExtension.trustedAppItemsSummary.total',
    { defaultMessage: 'Total' }
  ),
};

const CSS_BOLD: Readonly<React.CSSProperties> = { fontWeight: 'bold' };

export const TrustedAppItemsSummary = memo(() => {
  const {
    services: { http },
  } = useKibana<CoreStart>();
  const [stats, setStats] = useState<GetTrustedAppsSummaryResponse | undefined>();
  const [trustedAppsApi] = useState(() => new TrustedAppsHttpService(http));

  useEffect(() => {
    trustedAppsApi.getTrustedAppsSummary().then((response) => {
      setStats(response);
    });
  }, [trustedAppsApi]);

  return (
    <EuiFlexGroup responsive={false}>
      {SUMMARY_KEYS.map((stat) => {
        return (
          <EuiFlexItem>
            <SummaryStat
              value={stats?.[stat] ?? 0}
              color={stat === 'total' ? 'primary' : 'default'}
              key={stat}
            >
              {SUMMARY_LABELS[stat]}
            </SummaryStat>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
});

TrustedAppItemsSummary.displayName = 'TrustedAppItemsSummary';

const SummaryStat: FC<{ value: number; color?: EuiBadgeProps['color'] }> = memo(
  ({ children, value, color, ...commonProps }) => {
    return (
      <EuiText className="eui-displayInlineBlock" size="s">
        <EuiFlexGroup
          responsive={false}
          justifyContent="center"
          direction="row"
          alignItems="center"
        >
          <EuiFlexItem grow={false} style={color === 'primary' ? CSS_BOLD : undefined}>
            {children}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color={color}>{value}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiText>
    );
  }
);

SummaryStat.displayName = 'SummaryState';
