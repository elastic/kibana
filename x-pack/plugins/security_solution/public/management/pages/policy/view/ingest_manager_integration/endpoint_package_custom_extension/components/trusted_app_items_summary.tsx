/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiBadgeProps, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React, { FC, memo, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { CoreStart } from 'kibana/public';
import { useKibana } from '../../../../../../../../../../../src/plugins/kibana_react/public';
import { TrustedAppsHttpService } from '../../../../../trusted_apps/service';

export const TrustedAppItemsSummary = memo(() => {
  const {
    services: { http },
  } = useKibana<CoreStart>();
  const [total, setTotal] = useState<number>(0);
  const [trustedAppsApi] = useState(() => new TrustedAppsHttpService(http));

  useEffect(() => {
    trustedAppsApi
      .getTrustedAppsList({
        page: 1,
        per_page: 1,
      })
      .then((response) => {
        setTotal(response.total);
      });
  }, [trustedAppsApi]);

  return (
    <div className="eui-textRight">
      <SummaryStat value={total} color="primary">
        <FormattedMessage
          id="xpack.securitySolution.endpoint.fleetCustomExtension.trustedAppItemsSummary.totalLabel"
          defaultMessage="Total"
        />
      </SummaryStat>
    </div>
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
          <EuiFlexItem grow={false} style={{ fontWeight: 'bold' }}>
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
