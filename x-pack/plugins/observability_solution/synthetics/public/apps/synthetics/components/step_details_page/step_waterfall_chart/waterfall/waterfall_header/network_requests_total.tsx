/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiI18nNumber, EuiIconTip, EuiFlexGroup, EuiText } from '@elastic/eui';

interface Props {
  totalNetworkRequests: number;
  fetchedNetworkRequests: number;
  highlightedNetworkRequests: number;
}

export const NetworkRequestsTotal = ({
  totalNetworkRequests,
  fetchedNetworkRequests,
  highlightedNetworkRequests,
}: Props) => {
  return (
    <EuiFlexGroup>
      <EuiText size="xs">
        <FormattedMessage
          id="xpack.synthetics.waterfall.networkRequests.count"
          defaultMessage="Showing {countShown} of {total} {networkRequestsLabel}"
          values={{
            countShown: (
              <strong data-test-subj="syntheticsWaterfallChartCountShown">
                <EuiI18nNumber value={highlightedNetworkRequests} />
              </strong>
            ),
            total: <EuiI18nNumber value={totalNetworkRequests} />,
            networkRequestsLabel: (
              <strong>
                {i18n.translate('xpack.synthetics.waterfall.networkRequests.pluralizedCount', {
                  defaultMessage: '{total, plural, one {network request} other {network requests}}',
                  values: {
                    total: totalNetworkRequests,
                  },
                })}
              </strong>
            ),
          }}
        />
        {totalNetworkRequests > fetchedNetworkRequests && (
          <EuiIconTip
            type="iInCircle"
            color="warning"
            content={i18n.translate(
              'xpack.synthetics.synthetics.waterfall.requestsTotalMessage.info',
              {
                defaultMessage: 'Waterfall view only shows up to 1000 requests',
              }
            )}
          />
        )}
      </EuiText>
    </EuiFlexGroup>
  );
};
