/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiFlexGroup,
  EuiTable,
  EuiTableRow,
  EuiTableHeaderCell,
  EuiTableHeader,
  EuiFieldSearch,
  EuiSpacer,
  EuiFlexItem,
  EuiTableBody,
} from '@elastic/eui';
import { EnrichedDeprecationInfo } from '../../../../common/types';
import {
  MlSnapshotsTableRow,
  DefaultTableRow,
  IndexSettingsTableRow,
  ReindexTableRow,
} from './deprecation_types';
import { DeprecationTableColumns } from '../types';

const i18nTexts = {
  criticalBadgeLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.table.criticalBadgeLabel',
    {
      defaultMessage: 'critical',
    }
  ),
  refreshButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.table.refreshButtonLabel',
    {
      defaultMessage: 'Refresh',
    }
  ),
  noDeprecationsMessage: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.table.noDeprecationsMessage',
    {
      defaultMessage: 'No Elasticsearch deprecations found',
    }
  ),
  typeFilterLabel: i18n.translate('xpack.upgradeAssistant.esDeprecations.table.typeFilterLabel', {
    defaultMessage: 'Type',
  }),
  criticalFilterLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.table.criticalFilterLabel',
    {
      defaultMessage: 'Critical',
    }
  ),
  searchPlaceholderLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.table.searchPlaceholderLabel',
    {
      defaultMessage: 'Filter',
    }
  ),
};

const cellTypeToLabelMap = {
  type: i18n.translate('xpack.upgradeAssistant.esDeprecations.table.typeColumnTitle', {
    defaultMessage: 'Type',
  }),
  index: i18n.translate('xpack.upgradeAssistant.esDeprecations.table.sourceColumnTitle', {
    defaultMessage: 'Source',
  }),
  message: i18n.translate('xpack.upgradeAssistant.esDeprecations.table.issueColumnTitle', {
    defaultMessage: 'Issue',
  }),
  correctiveAction: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.table.statusColumnTitle',
    {
      defaultMessage: 'Status',
    }
  ),
};

const headerLabels = Object.values(cellTypeToLabelMap);
const cellTypes = Object.keys(cellTypeToLabelMap) as DeprecationTableColumns[];

interface Props {
  deprecations?: EnrichedDeprecationInfo[];
  reload: () => void;
}

export const EsDeprecationsTable: React.FunctionComponent<Props> = ({ deprecations, reload }) => {
  // const pagination = {
  //   initialPageSize: 20,
  //   pageSizeOptions: [10, 20, 50],
  // };

  // const sorting = {
  //   sort: {
  //     field: 'isCritical',
  //     direction: 'desc',
  //   },
  //   enableAllColumns: true,
  // } as const;

  // const searchConfig = {
  //   box: {
  //     incremental: true,
  //     placeholder: i18nTexts.searchPlaceholderLabel,
  //   },
  //   filters: [
  //     {
  //       type: 'is',
  //       field: 'isCritical',
  //       name: i18nTexts.criticalFilterLabel,
  //     },
  //     {
  //       type: 'field_value_selection',
  //       field: 'type',
  //       name: i18nTexts.typeFilterLabel,
  //       multiSelect: false,
  //       options: (Object.keys(DEPRECATION_TYPE_MAP) as Array<
  //         keyof typeof DEPRECATION_TYPE_MAP
  //       >).map((type) => ({
  //         value: type,
  //         name: DEPRECATION_TYPE_MAP[type],
  //       })),
  //     },
  //   ] as SearchFilterConfig[],
  //   toolsRight: [
  //     <EuiButton
  //       iconType="refresh"
  //       onClick={reload}
  //       data-test-subj="reloadButton"
  //       key="reloadButton"
  //     >
  //       {i18nTexts.refreshButtonLabel}
  //     </EuiButton>,
  //   ],
  // };

  // return (
  //   <EuiInMemoryTable
  //     items={deprecations || []}
  //     sorting={sorting}
  //     itemId="name"
  //     columns={columns}
  //     search={searchConfig}
  //     pagination={pagination}
  //     rowProps={() => ({
  //       'data-test-subj': 'row',
  //     })}
  //     cellProps={() => ({
  //       'data-test-subj': 'cell',
  //     })}
  //     data-test-subj="esDeprecationsTable"
  //     message={i18nTexts.noDeprecationsMessage}
  //     tableLayout="auto"
  //   />
  // );

  const renderTableRowCells = (deprecation: EnrichedDeprecationInfo, index: number) => {
    const { correctiveAction } = deprecation;

    if (correctiveAction?.type === 'mlSnapshot') {
      return <MlSnapshotsTableRow deprecation={deprecation} rowFieldNames={cellTypes} />;
    }

    if (correctiveAction?.type === 'indexSetting') {
      return <IndexSettingsTableRow deprecation={deprecation} rowFieldNames={cellTypes} />;
    }

    if (correctiveAction?.type === 'reindex') {
      return <ReindexTableRow deprecation={deprecation} rowFieldNames={cellTypes} />;
    }

    return <DefaultTableRow deprecation={deprecation} rowFieldNames={cellTypes} />;
  };

  // TODO implement commented-out table functionality
  return (
    <div>
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem>
          <EuiFieldSearch fullWidth placeholder={i18nTexts.searchPlaceholderLabel} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            iconType="refresh"
            onClick={reload}
            data-test-subj="reloadButton"
            key="reloadButton"
          >
            {i18nTexts.refreshButtonLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {/* <EuiTableHeaderMobile>
        <EuiFlexGroup
          responsive={false}
          justifyContent="spaceBetween"
          alignItems="baseline">
          <EuiFlexItem grow={false}>
            <EuiTableSortMobile items={this.getTableMobileSortItems()} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiTableHeaderMobile> */}

      <EuiTable id="es_deprecations_table">
        <EuiTableHeader>
          {headerLabels.map((label) => {
            return (
              <EuiTableHeaderCell
                key={label}
                // onSort={() => this.onSort(fieldName)}
                // isSorted={isSorted}
                // isSortAscending={isSortAscending}
              >
                {label}
              </EuiTableHeaderCell>
            );
          })}
        </EuiTableHeader>

        <EuiTableBody>
          {(deprecations || []).map((deprecation, index) => {
            return (
              <EuiTableRow data-test-subj="deprecationTableRow" key={`deprecation-row-${index}`}>
                {renderTableRowCells(deprecation, index)}
              </EuiTableRow>
            );
          })}
        </EuiTableBody>

        {/* <EuiTableFooter>{this.renderFooterCells()}</EuiTableFooter> */}
      </EuiTable>

      <EuiSpacer size="m" />

      {/* <EuiTablePagination
        aria-controls={exampleId}
        activePage={this.pager.getCurrentPageIndex()}
        itemsPerPage={this.state.itemsPerPage}
        itemsPerPageOptions={[5, 10, 20]}
        pageCount={this.pager.getTotalPages()}
        onChangeItemsPerPage={this.onChangeItemsPerPage}
        onChangePage={this.onChangePage}
      /> */}
    </div>
  );
};
