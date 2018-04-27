/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';

import { get } from 'lodash';
import { TRANSACTION_ID } from '../../../../../common/constants';

import { KuiTableHeaderCell } from '@kbn/ui-framework/components';
import { AlignmentKuiTableHeaderCell } from '../../../shared/APMTable/APMTable';

import FilterableAPMTable from '../../../shared/APMTable/FilterableAPMTable';
import ListItem from './ListItem';
import ImpactTooltip from './ImpactTooltip';
import withService from '../../../shared/withService';

const getRelativeImpact = (impact, impactMin, impactMax) =>
  Math.max((impact - impactMin) / Math.max(impactMax - impactMin, 1) * 100, 1);

function tpmLabel(type) {
  return type === 'request' ? 'Req. per minute' : 'Trans. per minute';
}

function avgLabel(agentName) {
  return agentName === 'js-base' ? 'Page load time' : 'Avg. resp. time';
}

class List extends Component {
  render() {
    const {
      serviceName,
      service,
      type,
      items,
      changeTransactionSorting,
      transactionSorting
    } = this.props;

    const renderHead = () => {
      const cells = [
        { key: 'name', sortable: true, label: 'Name' },
        {
          key: 'avg',
          sortable: true,
          alignRight: true,
          label: avgLabel(service.data.agentName)
        },
        {
          key: 'p95',
          sortable: true,
          alignRight: true,
          label: '95th percentile'
        },
        {
          key: 'tpm',
          sortable: true,
          alignRight: true,
          label: tpmLabel(type)
        },
        { key: 'spacer', sortable: false, label: '' }
      ].map(({ key, sortable, label, alignRight }) => (
        <AlignmentKuiTableHeaderCell
          key={key}
          className={alignRight ? 'kuiTableHeaderCell--alignRight' : ''}
          {...(sortable
            ? {
                onSort: () => changeTransactionSorting(key),
                isSorted: transactionSorting.key === key,
                isSortAscending: !transactionSorting.descending
              }
            : {})}
        >
          {label}
        </AlignmentKuiTableHeaderCell>
      ));

      const impactCell = (
        <KuiTableHeaderCell
          key={'impact'}
          onSort={() => changeTransactionSorting('impact')}
          isSorted={transactionSorting.key === 'impact'}
          isSortAscending={!transactionSorting.descending}
        >
          Impact
          <ImpactTooltip />
        </KuiTableHeaderCell>
      );

      return [...cells, impactCell];
    };

    const impacts = items.map(({ impact }) => impact);
    const impactMin = Math.min(...impacts);
    const impactMax = Math.max(...impacts);

    const renderBody = transactions => {
      return transactions.map(transaction => {
        return (
          <ListItem
            key={get({ transaction }, TRANSACTION_ID)}
            serviceName={serviceName}
            type={type}
            transaction={transaction}
            impact={getRelativeImpact(transaction.impact, impactMin, impactMax)}
          />
        );
      });
    };

    const renderFooterText = () => {
      return items.length === 500
        ? 'Showing first 500 results ordered by response time'
        : '';
    };

    return (
      <FilterableAPMTable
        searchableFields={['name']}
        items={items}
        emptyMessageHeading="No transactions in the selected time range."
        renderHead={renderHead}
        renderBody={renderBody}
        renderFooterText={renderFooterText}
      />
    );
  }
}

export default withService(List);
