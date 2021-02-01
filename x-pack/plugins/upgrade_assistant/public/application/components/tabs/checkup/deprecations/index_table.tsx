/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortBy } from 'lodash';
import React from 'react';

import { EuiBasicTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ReindexButton } from './reindex';
import { AppContext } from '../../../../app_context';
import { EnrichedDeprecationInfo } from '../../../../../../common/types';

const PAGE_SIZES = [10, 25, 50, 100, 250, 500, 1000];

export interface IndexDeprecationDetails {
  index: string;
  reindex: boolean;
  blockerForReindexing?: EnrichedDeprecationInfo['blockerForReindexing'];
  details?: string;
}

export interface IndexDeprecationTableProps {
  indices: IndexDeprecationDetails[];
}

interface IndexDeprecationTableState {
  sortField: string;
  sortDirection: 'asc' | 'desc';
  pageIndex: number;
  pageSize: number;
}

export class IndexDeprecationTable extends React.Component<
  IndexDeprecationTableProps,
  IndexDeprecationTableState
> {
  constructor(props: IndexDeprecationTableProps) {
    super(props);

    this.state = {
      sortField: 'index',
      sortDirection: 'asc',
      pageIndex: 0,
      pageSize: 10,
    };
  }

  public render() {
    const { pageIndex, pageSize, sortField, sortDirection } = this.state;

    const columns = [
      {
        field: 'index',
        name: i18n.translate(
          'xpack.upgradeAssistant.checkupTab.deprecations.indexTable.indexColumnLabel',
          {
            defaultMessage: 'Index',
          }
        ),
        sortable: true,
      },
      {
        field: 'details',
        name: i18n.translate(
          'xpack.upgradeAssistant.checkupTab.deprecations.indexTable.detailsColumnLabel',
          {
            defaultMessage: 'Details',
          }
        ),
      },
    ];

    const actionsColumn = this.generateActionsColumn();

    if (actionsColumn) {
      columns.push(actionsColumn as any);
    }

    const sorting = {
      sort: { field: sortField as keyof IndexDeprecationDetails, direction: sortDirection },
    };
    const pagination = {
      pageIndex,
      pageSize,
      ...this.pageSizeOptions(),
    };

    return (
      <EuiBasicTable
        items={this.getRows()}
        columns={columns}
        sorting={sorting}
        pagination={pagination}
        onChange={this.onTableChange}
        hasActions={false}
      />
    );
  }

  private getRows() {
    const { sortField, sortDirection, pageIndex, pageSize } = this.state;
    const { indices } = this.props;

    let sorted = sortBy(indices, sortField);
    if (sortDirection === 'desc') {
      sorted = sorted.reverse();
    }

    const start = pageIndex * pageSize;
    return sorted.slice(start, start + pageSize);
  }

  private onTableChange = (tableProps: any) => {
    this.setState({
      sortField: tableProps.sort.field,
      sortDirection: tableProps.sort.direction,
      pageIndex: tableProps.page.index,
      pageSize: tableProps.page.size,
    });
  };

  private pageSizeOptions() {
    const { indices } = this.props;
    const totalItemCount = indices.length;

    // If we only have that smallest page size, don't show any page size options.
    if (totalItemCount <= PAGE_SIZES[0]) {
      return { totalItemCount, pageSizeOptions: [], hidePerPageOptions: true };
    }

    // Keep a size option if the # of items is larger than the previous option.
    // This avoids having a long list of useless page sizes.
    const pageSizeOptions = PAGE_SIZES.filter((perPage, idx) => {
      return idx === 0 || totalItemCount > PAGE_SIZES[idx - 1];
    });

    return { totalItemCount, pageSizeOptions, hidePerPageOptions: false };
  }

  private generateActionsColumn() {
    // NOTE: this naive implementation assumes all indices in the table are
    // should show the reindex button. This should work for known usecases.
    const { indices } = this.props;
    if (!indices.find((i) => i.reindex === true)) {
      return null;
    }

    return {
      actions: [
        {
          render(indexDep: IndexDeprecationDetails) {
            return (
              <AppContext.Consumer>
                {({ http, docLinks }) => {
                  return (
                    <ReindexButton
                      docLinks={docLinks}
                      reindexBlocker={indexDep.blockerForReindexing}
                      indexName={indexDep.index!}
                      http={http}
                    />
                  );
                }}
              </AppContext.Consumer>
            );
          },
        },
      ],
    };
  }
}
