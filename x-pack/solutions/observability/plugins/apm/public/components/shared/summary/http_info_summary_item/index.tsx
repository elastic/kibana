/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { css } from '@emotion/react';
import { HttpStatusCode } from '@kbn/apm-ui-shared';
import { unit } from '../../../../utils/style';

const urlStyles = css`
  display: inline-block;
  vertical-align: bottom;
  max-width: ${unit * 24}px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
interface HttpInfoProps {
  method?: string;
  status?: number;
  url?: string;
}

export function HttpInfoSummaryItem({ status, method, url }: HttpInfoProps) {
  const { euiTheme } = useEuiTheme();

  if (!url) {
    return null;
  }

  const methodLabel = i18n.translate('xpack.apm.transactionDetails.requestMethodLabel', {
    defaultMessage: 'Request method',
  });

  return (
    <span
      css={css`
        whitespace: nowrap;
      `}
    >
      <EuiBadge
        title={undefined}
        css={{
          marginRight: `${euiTheme.size.xs}`,
        }}
      >
        {method && (
          <EuiToolTip content={methodLabel}>
            <span data-test-subj="apmHttpInfoRequestMethod">{method.toUpperCase()}</span>
          </EuiToolTip>
        )}{' '}
        {url && (
          <EuiToolTip content={url}>
            <span data-test-subj="apmHttpInfoUrl" css={urlStyles}>
              {url}
            </span>
          </EuiToolTip>
        )}
      </EuiBadge>
      {status && <HttpStatusCode code={status} showTooltip />}
    </span>
  );
}
