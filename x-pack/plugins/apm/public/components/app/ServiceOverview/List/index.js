/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import orderBy from 'lodash.orderby';
import styled from 'styled-components';
import numeral from '@elastic/numeral';
import { EuiBasicTable } from '@elastic/eui';
import { RelativeLink } from '../../../../utils/url';
import { fontSizes, truncate } from '../../../../style/variables';
import TooltipOverlay from '../../../shared/TooltipOverlay';
import { asMillisWithDefault } from '../../../../utils/formatters';

function formatNumber(value) {
  if (value === 0) {
    return '0';
  }
  const formatted = numeral(value).format('0.0');
  return formatted <= 0.1 ? '< 0.1' : formatted;
}

// TODO: duplicated
function paginateItems({ items, pageIndex, pageSize }) {
  return items.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
}

function formatString(value) {
  return value || 'N/A';
}

const AppLink = styled(RelativeLink)`
  font-size: ${fontSizes.large};
  ${truncate('100%')};
`;

class List extends Component {
  state = {
    page: {
      index: 0,
      size: 10
    },
    sort: {
      field: 'serviceName',
      direction: 'asc'
    }
  };

  onTableChange = ({ page = {}, sort = {} }) => {
    this.setState({ page, sort });
  };

  render() {
    const columns = [
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

    const sortedItems = orderBy(
      this.props.items,
      this.state.sort.field,
      this.state.sort.direction
    );

    const paginatedItems = paginateItems({
      items: sortedItems,
      pageIndex: this.state.page.index,
      pageSize: this.state.page.size
    });

    return (
      <EuiBasicTable
        noItemsMessage={this.props.noItemsMessage}
        items={paginatedItems}
        columns={columns}
        pagination={{
          pageIndex: this.state.page.index,
          pageSize: this.state.page.size,
          totalItemCount: this.props.items.length
        }}
        sorting={{
          sort: {
            field: this.state.sort.field,
            direction: this.state.sort.direction
          }
        }}
        onChange={this.onTableChange}
      />
    );
  }
}

List.propTypes = {
  noItemsMessage: PropTypes.node,
  items: PropTypes.array
};

List.defaultProps = {
  items: []
};

export default List;
