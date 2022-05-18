/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { sortBy } from 'lodash';
import {
  EuiButton,
  EuiFlexGroup,
  EuiTable,
  EuiTableRow,
  EuiTableHeaderCell,
  EuiTableHeader,
  EuiSearchBar,
  EuiSpacer,
  EuiFlexItem,
  EuiTableBody,
  EuiTablePagination,
  EuiCallOut,
  EuiTableRowCell,
  Pager,
  Query,
} from '@elastic/eui';
import { EnrichedDeprecationInfo } from '../../../../common/types';
import { useAppContext } from '../../app_context';
import {
  MlSnapshotsTableRow,
  DefaultTableRow,
  IndexSettingsTableRow,
  ReindexTableRow,
  ClusterSettingsTableRow,
} from './deprecation_types';
import { DeprecationTableColumns } from '../types';
import { DEPRECATION_TYPE_MAP, PAGINATION_CONFIG } from '../constants';

const i18nTexts = {
  refreshButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.table.refreshButtonLabel',
    {
      defaultMessage: 'Refresh',
    }
  ),
  noDeprecationsMessage: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.table.noDeprecationsMessage',
    {
      defaultMessage: 'No Elasticsearch deprecation issues found',
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

const cellToLabelMap = {
  isCritical: {
    label: i18n.translate('xpack.upgradeAssistant.esDeprecations.table.statusColumnTitle', {
      defaultMessage: 'Status',
    }),
    width: '8px',
  },
  message: {
    label: i18n.translate('xpack.upgradeAssistant.esDeprecations.table.issueColumnTitle', {
      defaultMessage: 'Issue',
    }),
    width: '36px',
  },
  type: {
    label: i18n.translate('xpack.upgradeAssistant.esDeprecations.table.typeColumnTitle', {
      defaultMessage: 'Type',
    }),
    width: '10px',
  },
  index: {
    label: i18n.translate('xpack.upgradeAssistant.esDeprecations.table.nameColumnTitle', {
      defaultMessage: 'Name',
    }),
    width: '24px',
  },
  correctiveAction: {
    label: i18n.translate('xpack.upgradeAssistant.esDeprecations.table.resolutionColumnTitle', {
      defaultMessage: 'Resolution',
    }),
    width: '24px',
  },
};

const cellTypes = Object.keys(cellToLabelMap) as DeprecationTableColumns[];
const pageSizeOptions = PAGINATION_CONFIG.pageSizeOptions;

const renderTableRowCells = (
  deprecation: EnrichedDeprecationInfo,
  mlUpgradeModeEnabled: boolean
) => {
  switch (deprecation.correctiveAction?.type) {
    case 'mlSnapshot':
      return (
        <MlSnapshotsTableRow
          deprecation={deprecation}
          rowFieldNames={cellTypes}
          mlUpgradeModeEnabled={mlUpgradeModeEnabled}
        />
      );

    case 'indexSetting':
      return <IndexSettingsTableRow deprecation={deprecation} rowFieldNames={cellTypes} />;

    case 'clusterSetting':
      return <ClusterSettingsTableRow deprecation={deprecation} rowFieldNames={cellTypes} />;

    case 'reindex':
      return <ReindexTableRow deprecation={deprecation} rowFieldNames={cellTypes} />;

    default:
      return <DefaultTableRow deprecation={deprecation} rowFieldNames={cellTypes} />;
  }
};

interface Props {
  deprecations?: EnrichedDeprecationInfo[];
  reload: () => void;
}

interface SortConfig {
  isSortAscending: boolean;
  sortField: DeprecationTableColumns;
}

const getSortedItems = (deprecations: EnrichedDeprecationInfo[], sortConfig: SortConfig) => {
  const { isSortAscending, sortField } = sortConfig;
  const sorted = sortBy(deprecations, [
    (deprecation) => {
      if (sortField === 'isCritical') {
        // Critical deprecations should take precendence in ascending order
        return deprecation.isCritical !== true;
      }
      return deprecation[sortField];
    },
  ]);

  return isSortAscending ? sorted : sorted.reverse();
};

export const EsDeprecationsTable: React.FunctionComponent<Props> = ({
  deprecations = [],
  reload,
}) => {
  const {
    services: { api },
  } = useAppContext();

  const { data } = api.useLoadMlUpgradeMode();
  const mlUpgradeModeEnabled = !!data?.mlUpgradeModeEnabled;

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    isSortAscending: true,
    sortField: 'isCritical',
  });

  const [itemsPerPage, setItemsPerPage] = useState(PAGINATION_CONFIG.initialPageSize);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState<Query>(EuiSearchBar.Query.MATCH_ALL);
  const [searchError, setSearchError] = useState<{ message: string } | undefined>(undefined);

  const [filteredDeprecations, setFilteredDeprecations] = useState<EnrichedDeprecationInfo[]>(
    getSortedItems(deprecations, sortConfig)
  );

  const pager = useMemo(
    () => new Pager(deprecations.length, itemsPerPage, currentPageIndex),
    [currentPageIndex, deprecations, itemsPerPage]
  );

  const visibleDeprecations = useMemo(
    () => filteredDeprecations.slice(pager.firstItemIndex, pager.lastItemIndex + 1),
    [filteredDeprecations, pager]
  );

  const handleSort = useCallback(
    (fieldName: DeprecationTableColumns) => {
      const newSortConfig = {
        isSortAscending: sortConfig.sortField === fieldName ? !sortConfig.isSortAscending : true,
        sortField: fieldName,
      };
      setSortConfig(newSortConfig);
    },
    [sortConfig]
  );

  const handleSearch = useCallback(({ query, error }) => {
    if (error) {
      setSearchError(error);
    } else {
      setSearchError(undefined);
      setSearchQuery(query);
    }
  }, []);

  useEffect(() => {
    const { setTotalItems, goToPageIndex } = pager;
    const deprecationsFilteredByQuery = EuiSearchBar.Query.execute(searchQuery, deprecations);
    const deprecationsSortedByFieldType = getSortedItems(deprecationsFilteredByQuery, sortConfig);

    setTotalItems(deprecationsSortedByFieldType.length);
    setFilteredDeprecations(deprecationsSortedByFieldType);

    // Reset pagination if the filtered results return a different length
    if (deprecationsSortedByFieldType.length !== filteredDeprecations.length) {
      goToPageIndex(0);
    }
  }, [deprecations, sortConfig, pager, searchQuery, filteredDeprecations.length]);

  return (
    <>
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem data-test-subj="searchBarContainer">
          <EuiSearchBar
            box={{
              placeholder: i18nTexts.searchPlaceholderLabel,
              incremental: true,
            }}
            filters={[
              {
                type: 'is',
                field: 'isCritical',
                name: i18nTexts.criticalFilterLabel,
              },
              {
                type: 'field_value_selection',
                field: 'type',
                name: i18nTexts.typeFilterLabel,
                multiSelect: false,
                options: (
                  Object.keys(DEPRECATION_TYPE_MAP) as Array<keyof typeof DEPRECATION_TYPE_MAP>
                ).map((type) => ({
                  value: type,
                  name: DEPRECATION_TYPE_MAP[type],
                })),
              },
            ]}
            onChange={handleSearch}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            iconType="refresh"
            onClick={reload}
            data-test-subj="refreshButton"
            key="refreshButton"
          >
            {i18nTexts.refreshButtonLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      {searchError && (
        <div data-test-subj="invalidSearchQueryMessage">
          <EuiSpacer size="l" />

          <EuiCallOut
            iconType="alert"
            color="danger"
            title={`Invalid search: ${searchError.message}`}
          />
        </div>
      )}

      <EuiSpacer size="m" />

      <EuiTable data-test-subj="esDeprecationsTable">
        <EuiTableHeader>
          {Object.entries(cellToLabelMap).map(([fieldName, cell]) => {
            return (
              <EuiTableHeaderCell
                width={cell.width}
                key={cell.label}
                onSort={() => handleSort(fieldName as DeprecationTableColumns)}
                isSorted={sortConfig.sortField === fieldName}
                isSortAscending={sortConfig.isSortAscending}
              >
                {cell.label}
              </EuiTableHeaderCell>
            );
          })}
        </EuiTableHeader>

        {filteredDeprecations.length === 0 ? (
          <EuiTableBody>
            <EuiTableRow data-test-subj="noDeprecationsRow">
              <EuiTableRowCell
                align="center"
                colSpan={cellTypes.length}
                mobileOptions={{ width: '100%' }}
              >
                {i18nTexts.noDeprecationsMessage}
              </EuiTableRowCell>
            </EuiTableRow>
          </EuiTableBody>
        ) : (
          <EuiTableBody>
            {visibleDeprecations.map((deprecation, index) => {
              return (
                <EuiTableRow data-test-subj="deprecationTableRow" key={`deprecation-row-${index}`}>
                  {renderTableRowCells(deprecation, mlUpgradeModeEnabled)}
                </EuiTableRow>
              );
            })}
          </EuiTableBody>
        )}
      </EuiTable>

      <EuiSpacer size="m" />

      <EuiTablePagination
        data-test-subj="esDeprecationsPagination"
        activePage={pager.getCurrentPageIndex()}
        itemsPerPage={pager.itemsPerPage}
        itemsPerPageOptions={pageSizeOptions}
        pageCount={pager.getTotalPages()}
        onChangeItemsPerPage={setItemsPerPage}
        onChangePage={setCurrentPageIndex}
      />
    </>
  );
};
