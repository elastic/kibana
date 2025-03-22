/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ServiceMapWarnings } from '../../../../common/service_map';

interface Props {
  warnings: ServiceMapWarnings;
}

const MESSAGES: Record<keyof ServiceMapWarnings, string> = {
  sharedDestinations: i18n.translate('xpack.apm.serviceMap.warning.sharedDestination', {
    defaultMessage: `Load balancers, API gateways, or message queues may associate an exit span with multiple downstream services, affecting how the service map establishes connections.`,
  }),
};

export function WarningTooltip({ warnings }: Props) {
  const hasWarnings = useMemo(() => Object.values(warnings).some((value) => value), [warnings]);

  if (!hasWarnings) {
    return null;
  }

  const badge = (
    <EuiText size="xs" color="subdued">
      {i18n.translate('xpack.apm.aggregatedTransactions.fallback.badge', {
        defaultMessage: `Incomplete service map?`,
      })}
    </EuiText>
  );

  return (
    <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiToolTip
          position="top"
          content={
            <FormattedMessage
              id="xpack.apm.serviceMap.warningList"
              defaultMessage="{warningList}"
              values={{
                warningList: (
                  <ul>
                    {Object.keys(warnings).map((reasonKey, index) => (
                      <li key={index}>
                        <EuiText size="s">
                          {MESSAGES[reasonKey as keyof ServiceMapWarnings]}
                        </EuiText>
                      </li>
                    ))}
                  </ul>
                ),
              }}
            />
          }
        >
          <button>
            <EuiIcon type="questionInCircle" color="subdue" />
          </button>
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{badge}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
