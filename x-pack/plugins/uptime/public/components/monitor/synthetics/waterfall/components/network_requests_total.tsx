/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiIconTip } from '@elastic/eui';
import { NetworkRequestsTotalStyle } from './styles';

interface Props {
  totalNetworkRequests: number;
  fetchedNetworkRequests: number;
}

export const NetworkRequestsTotal = ({ totalNetworkRequests, fetchedNetworkRequests }: Props) => {
  return (
    <NetworkRequestsTotalStyle size="xs" color="subdued">
      <strong>
        {i18n.translate('xpack.uptime.synthetics.waterfall.requestsTotalMessage', {
          defaultMessage: '{numNetworkRequests} network requests',
          values: {
            numNetworkRequests:
              totalNetworkRequests > fetchedNetworkRequests
                ? i18n.translate('xpack.uptime.synthetics.waterfall.requestsTotalMessage.first', {
                    defaultMessage: 'First {count}',
                    values: { count: `${fetchedNetworkRequests}/${totalNetworkRequests}` },
                  })
                : totalNetworkRequests,
          },
        })}
      </strong>
      {totalNetworkRequests > fetchedNetworkRequests && (
        <EuiIconTip
          type={'iInCircle'}
          content={i18n.translate('xpack.uptime.synthetics.waterfall.requestsTotalMessage.info', {
            defaultMessage: 'Waterfall view only shows up to 1000 requests',
          })}
        />
      )}
    </NetworkRequestsTotalStyle>
  );
};
