/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from '@emotion/styled';
import { truncate, unit } from '../../../../utils/style';
import { HttpStatusBadge } from '../http_status_badge';

const HttpInfoBadge = styled(EuiBadge)`
  margin-right: ${({ theme }) => theme.euiTheme.size.xs};
`;

const Url = styled('span')`
  display: inline-block;
  vertical-align: bottom;
  ${truncate(unit * 24)};
`;
interface HttpInfoProps {
  method?: string;
  status?: number;
  url: string;
}

const Span = styled('span')`
  white-space: nowrap;
`;

export function HttpInfoSummaryItem({ status, method, url }: HttpInfoProps) {
  if (!url) {
    return null;
  }

  const methodLabel = i18n.translate('xpack.apm.transactionDetails.requestMethodLabel', {
    defaultMessage: 'Request method',
  });

  return (
    <Span>
      <HttpInfoBadge title={undefined}>
        {method && (
          <EuiToolTip content={methodLabel}>
            <>{method.toUpperCase()}</>
          </EuiToolTip>
        )}{' '}
        <EuiToolTip content={url}>
          <Url>{url}</Url>
        </EuiToolTip>
      </HttpInfoBadge>
      {status && <HttpStatusBadge status={status} />}
    </Span>
  );
}
