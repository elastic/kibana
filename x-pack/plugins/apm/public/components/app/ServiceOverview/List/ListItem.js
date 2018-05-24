/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { RelativeLink } from '../../../../utils/url';
import { KuiTableRow, KuiTableRowCell } from '@kbn/ui-framework/components';
import { fontSizes, truncate } from '../../../../style/variables';
import TooltipOverlay from '../../../shared/TooltipOverlay';
import { RIGHT_ALIGNMENT } from '@elastic/eui';
import { asMillisWithDefault } from '../../../../utils/formatters';
import numeral from '@elastic/numeral';

const ServiceNameCell = styled(KuiTableRowCell)`
  width: 40%;
`;

const ServiceCell = styled(KuiTableRowCell)`
  width: 15%;
`;

const AppLink = styled(RelativeLink)`
  font-size: ${fontSizes.large};
  ${truncate('100%')};
`;

function formatString(value) {
  return value || 'N/A';
}

function formatNumber(value) {
  if (value === 0) {
    return '0';
  }
  const formatted = numeral(value).format('0.0');
  return formatted <= 0.1 ? '< 0.1' : formatted;
}

function ListItem({ service }) {
  const {
    serviceName,
    agentName,
    transactionsPerMinute,
    errorsPerMinute,
    avgResponseTime
  } = service;

  return (
    <KuiTableRow>
      <ServiceNameCell>
        <TooltipOverlay content={formatString(serviceName)}>
          <AppLink path={`/${serviceName}/transactions`}>
            {formatString(serviceName)}
          </AppLink>
        </TooltipOverlay>
      </ServiceNameCell>
      <ServiceCell>{formatString(agentName)}</ServiceCell>
      <ServiceCell align={RIGHT_ALIGNMENT}>
        {asMillisWithDefault(avgResponseTime)}
      </ServiceCell>
      <ServiceCell align={RIGHT_ALIGNMENT}>
        {formatNumber(transactionsPerMinute)} tpm
      </ServiceCell>
      <ServiceCell align={RIGHT_ALIGNMENT}>
        {formatNumber(errorsPerMinute)} err.
      </ServiceCell>
    </KuiTableRow>
  );
}

export default ListItem;
