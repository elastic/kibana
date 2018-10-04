/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { EuiBasicTable } from '@elastic/eui';
import orderBy from 'lodash.orderby';
import TooltipOverlay from '../../../shared/TooltipOverlay';
import { RelativeLink, legacyEncodeURIComponent } from '../../../../utils/url';
import {
  asMillisWithDefault,
  asDecimal,
  tpmUnit
} from '../../../../utils/formatters';

import { fontFamilyCode, truncate } from '../../../../style/variables';
import ImpactSparkline from './ImpactSparkLine';

function tpmLabel(type) {
  return type === 'request' ? 'Req. per minute' : 'Trans. per minute';
}

function avgLabel(agentName) {
  return agentName === 'js-base' ? 'Page load time' : 'Avg. resp. time';
}

function paginateItems({ items, pageIndex, pageSize }) {
  return items.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
}

const TransactionNameLink = styled(RelativeLink)`
  ${truncate('100%')};
  font-family: ${fontFamilyCode};
`;

class List extends Component {
  state = {
    page: {
      index: 0,
      size: 25
    },
    sort: {
      field: 'impactRelative',
      direction: 'desc'
    }
  };

  onTableChange = ({ page = {}, sort = {} }) => {
    this.setState({ page, sort });
  };

  render() {
    const { agentName, serviceName, type } = this.props;

    const columns = [
      {
        field: 'name',
        name: 'Name',
        width: '50%',
        sortable: true,
        render: transactionName => {
          const transactionUrl = `${serviceName}/transactions/${legacyEncodeURIComponent(
            type
          )}/${legacyEncodeURIComponent(transactionName)}`;

          return (
            <TooltipOverlay content={transactionName || 'N/A'}>
              <TransactionNameLink path={`/${transactionUrl}`}>
                {transactionName || 'N/A'}
              </TransactionNameLink>
            </TooltipOverlay>
          );
        }
      },
      {
        field: 'avg',
        name: avgLabel(agentName),
        sortable: true,
        dataType: 'number',
        render: value => asMillisWithDefault(value)
      },
      {
        field: 'p95',
        name: '95th percentile',
        sortable: true,
        dataType: 'number',
        render: value => asMillisWithDefault(value)
      },
      {
        field: 'tpm',
        name: tpmLabel(type),
        sortable: true,
        dataType: 'number',
        render: value => `${asDecimal(value)} ${tpmUnit(type)}`
      },
      {
        field: 'impactRelative',
        name: 'Impact',
        sortable: true,
        dataType: 'number',
        render: value => <ImpactSparkline impact={value} />
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
        noItemsMessage="No transactions found"
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
  agentName: PropTypes.string,
  items: PropTypes.array,
  serviceName: PropTypes.string,
  type: PropTypes.string
};

export default List;

// const renderFooterText = () => {
//   return items.length === 500
//     ? 'Showing first 500 results ordered by response time'
//     : '';
// };
