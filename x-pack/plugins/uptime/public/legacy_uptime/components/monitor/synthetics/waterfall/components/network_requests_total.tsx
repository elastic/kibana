/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiIconTip } from '@elastic/eui';
import { NetworkRequestsTotalStyle } from './styles';

interface Props {
  totalNetworkRequests: number;
  fetchedNetworkRequests: number;
  highlightedNetworkRequests: number;
  showHighlightedNetworkRequests?: boolean;
}

export const NetworkRequestsTotal = ({
  totalNetworkRequests,
  fetchedNetworkRequests,
  highlightedNetworkRequests,
  showHighlightedNetworkRequests,
}: Props) => {
  return (
    <NetworkRequestsTotalStyle size="xs" color="subdued">
      <strong>
        <FormattedMessage
          id="xpack.uptime.synthetics.waterfall.requestsTotalMessage"
          defaultMessage="{numNetworkRequests} network requests"
          values={{
            numNetworkRequests:
              totalNetworkRequests > fetchedNetworkRequests ? (
                <FormattedMessage
                  id="xpack.uptime.synthetics.waterfall.requestsTotalMessage.first"
                  defaultMessage="First {count}"
                  values={{ count: `${fetchedNetworkRequests}/${totalNetworkRequests}` }}
                />
              ) : (
                totalNetworkRequests
              ),
          }}
        />{' '}
        {showHighlightedNetworkRequests && highlightedNetworkRequests >= 0 && (
          <FormattedMessage
            id="xpack.uptime.synthetics.waterfall.requestsHighlightedMessage"
            defaultMessage="({numHighlightedRequests} match the filter)"
            values={{
              numHighlightedRequests: highlightedNetworkRequests,
            }}
          />
        )}
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
