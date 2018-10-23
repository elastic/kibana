/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import numeral from '@elastic/numeral';
import { RelativeLink } from '../../../../utils/url';
import { fontSizes, truncate } from '../../../../style/variables';
import TooltipOverlay from '../../../shared/TooltipOverlay';
import { asMillisWithDefault } from '../../../../utils/formatters';
import { ManagedTable } from '../../../shared/ManagedTable';

// TODO: Consolidate these formatting helpers centrally
function formatNumber(value) {
  if (value === 0) {
    return '0';
  }
  const formatted = numeral(value).format('0.0');
  return formatted <= 0.1 ? '< 0.1' : formatted;
}

function formatString(value) {
  return value || 'N/A';
}

const AppLink = styled(RelativeLink)`
  font-size: ${fontSizes.large};
  ${truncate('100%')};
`;

const SERVICE_COLUMNS = [
  {
    field: 'serviceName',
    name: 'Name',
    width: '50%',
    sortable: true,
    render: serviceName => (
      <TooltipOverlay content={formatString(serviceName)}>
        <AppLink path={`/${serviceName}/transactions`}>
          {formatString(serviceName)}
        </AppLink>
      </TooltipOverlay>
    )
  },
  {
    field: 'agentName',
    name: 'Agent',
    sortable: true,
    render: agentName => formatString(agentName)
  },
  {
    field: 'avgResponseTime',
    name: 'Avg. response time',
    sortable: true,
    dataType: 'number',
    render: value => asMillisWithDefault(value)
  },
  {
    field: 'transactionsPerMinute',
    name: 'Trans. per minute',
    sortable: true,
    dataType: 'number',
    render: value => `${formatNumber(value)} tpm`
  },
  {
    field: 'errorsPerMinute',
    name: 'Errors per minute',
    sortable: true,
    dataType: 'number',
    render: value => `${formatNumber(value)} err.`
  }
];

export function ServiceList({ items, noItemsMessage }) {
  return (
    <ManagedTable
      columns={SERVICE_COLUMNS}
      items={items}
      noItemsMessage={noItemsMessage}
      initialSort={{ field: 'serviceName', direction: 'asc' }}
    />
  );
}

ServiceList.propTypes = {
  noItemsMessage: PropTypes.node,
  items: PropTypes.array
};

ServiceList.defaultProps = {
  items: []
};
