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
import {
  MlSnapshotsTableRow,
  DefaultTableRow,
  IndexSettingsTableRow,
  ReindexTableRow,
} from './deprecation_types';
import { DeprecationTableColumns } from '../types';
import { DEPRECATION_TYPE_MAP } from '../constants';

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

const cellTypes = Object.keys(cellTypeToLabelMap) as DeprecationTableColumns[];
const pageSizeOptions = [10, 20, 50];

const renderTableRowCells = (deprecation: EnrichedDeprecationInfo) => {
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
      if (sortField === 'correctiveAction') {
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
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    isSortAscending: true,
    sortField: 'correctiveAction',
  });

  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState<Query>(EuiSearchBar.Query.MATCH_ALL);
  const [searchError, setSearchError] = useState<{ message: string } | undefined>(undefined);

  const [filteredDeprecations, setFilteredDeprecations] = useState<EnrichedDeprecationInfo[]>(
    getSortedItems(deprecations, sortConfig)
  );

  const pager = useMemo(() => new Pager(deprecations.length, itemsPerPage, currentPageIndex), [
    currentPageIndex,
    deprecations,
    itemsPerPage,
  ]);

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
    const { firstItemIndex, lastItemIndex } = pager;
    const deprecationsFilteredByQuery = EuiSearchBar.Query.execute(searchQuery, deprecations);
    const deprecationsSortedByFieldType = getSortedItems(deprecationsFilteredByQuery, sortConfig);
    // Filter deprecations by current page and number of items per page
    const visibleDeprecations = deprecationsSortedByFieldType.slice(
      firstItemIndex,
      lastItemIndex + 1
    );
    setFilteredDeprecations(visibleDeprecations);
  }, [deprecations, sortConfig, pager, searchQuery]);

  return (
    <div>
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem>
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
                options: (Object.keys(DEPRECATION_TYPE_MAP) as Array<
                  keyof typeof DEPRECATION_TYPE_MAP
                >).map((type) => ({
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
            data-test-subj="reloadButton"
            key="reloadButton"
          >
            {i18nTexts.refreshButtonLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      {searchError && (
        <>
          <EuiSpacer size="l" />

          <EuiCallOut
            iconType="alert"
            color="danger"
            title={`Invalid search: ${searchError.message}`}
          />
        </>
      )}

      <EuiSpacer size="m" />

      <EuiTable id="es_deprecations_table">
        <EuiTableHeader>
          {Object.entries(cellTypeToLabelMap).map(([fieldName, label]) => {
            return (
              <EuiTableHeaderCell
                key={label}
                onSort={() => handleSort(fieldName as DeprecationTableColumns)}
                isSorted={sortConfig.sortField === fieldName}
                isSortAscending={sortConfig.isSortAscending}
              >
                {label}
              </EuiTableHeaderCell>
            );
          })}
        </EuiTableHeader>

        {filteredDeprecations.length === 0 ? (
          <EuiTableBody>
            <EuiTableRow>
              <EuiTableRowCell align="center" colSpan={cellTypes.length} isMobileFullWidth={true}>
                {i18nTexts.noDeprecationsMessage}
              </EuiTableRowCell>
            </EuiTableRow>
          </EuiTableBody>
        ) : (
          <EuiTableBody>
            {filteredDeprecations.map((deprecation, index) => {
              return (
                <EuiTableRow data-test-subj="deprecationTableRow" key={`deprecation-row-${index}`}>
                  {renderTableRowCells(deprecation)}
                </EuiTableRow>
              );
            })}
          </EuiTableBody>
        )}
      </EuiTable>

      <EuiSpacer size="m" />

      <EuiTablePagination
        activePage={pager.getCurrentPageIndex()}
        itemsPerPage={pager.itemsPerPage}
        itemsPerPageOptions={pageSizeOptions}
        pageCount={pager.getTotalPages()}
        onChangeItemsPerPage={setItemsPerPage}
        onChangePage={setCurrentPageIndex}
      />
    </div>
  );
};
