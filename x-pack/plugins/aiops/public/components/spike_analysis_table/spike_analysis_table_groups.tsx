/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useMemo, useState } from 'react';
import { sortBy } from 'lodash';

import {
  useEuiBackgroundColor,
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButtonIcon,
  EuiIcon,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiTableSortingType,
  EuiToolTip,
  RIGHT_ALIGNMENT,
  useEuiTheme,
  euiPaletteColorBlind,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { escapeKuery } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ChangePoint, FieldValuePair } from '@kbn/ml-agg-utils';

import { SEARCH_QUERY_LANGUAGE } from '../../application/utils/search_utils';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';

import { MiniHistogram } from '../mini_histogram';

import { getFailedTransactionsCorrelationImpactLabel } from './get_failed_transactions_correlation_impact_label';
import { SpikeAnalysisTable } from './spike_analysis_table';
import { useSpikeAnalysisTableRowContext } from './spike_analysis_table_row_provider';
import type { GroupTableItem } from './types';

const NARROW_COLUMN_WIDTH = '120px';
const EXPAND_COLUMN_WIDTH = '40px';
const ACTIONS_COLUMN_WIDTH = '60px';
const NOT_AVAILABLE = '--';
const MAX_GROUP_BADGES = 10;

const PAGINATION_SIZE_OPTIONS = [5, 10, 20, 50];
const DEFAULT_SORT_FIELD = 'pValue';
const DEFAULT_SORT_DIRECTION = 'asc';
const viewInDiscoverMessage = i18n.translate(
  'xpack.aiops.spikeAnalysisTable.linksMenu.viewInDiscover',
  {
    defaultMessage: 'View in Discover',
  }
);

interface SpikeAnalysisTableProps {
  changePoints: ChangePoint[];
  groupTableItems: GroupTableItem[];
  dataViewId?: string;
  loading: boolean;
}

export const SpikeAnalysisGroupsTable: FC<SpikeAnalysisTableProps> = ({
  changePoints,
  groupTableItems,
  dataViewId,
  loading,
}) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<keyof GroupTableItem>(DEFAULT_SORT_FIELD);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(DEFAULT_SORT_DIRECTION);
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, JSX.Element>>(
    {}
  );

  const { euiTheme } = useEuiTheme();
  const visColors = euiPaletteColorBlind();
  const primaryBackgroundColor = useEuiBackgroundColor('primary');

  const { pinnedGroup, selectedGroup, setPinnedGroup, setSelectedGroup } =
    useSpikeAnalysisTableRowContext();

  const pushExpandedTableItem = (
    expandedTableItems: ChangePoint[],
    items: FieldValuePair[],
    unique = false
  ) => {
    for (const groupItem of items) {
      const { fieldName, fieldValue } = groupItem;
      const itemToPush = {
        ...(changePoints.find(
          (changePoint) =>
            (changePoint.fieldName === fieldName ||
              changePoint.fieldName === `${fieldName}.keyword`) &&
            (changePoint.fieldValue === fieldValue ||
              changePoint.fieldValue === `${fieldValue}.keyword`)
        ) ?? {}),
        fieldName: `${fieldName}`,
        fieldValue: `${fieldValue}`,
        unique,
      } as ChangePoint;

      expandedTableItems.push(itemToPush);
    }
    return expandedTableItems;
  };

  const toggleDetails = (item: GroupTableItem) => {
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
    if (itemIdToExpandedRowMapValues[item.id]) {
      delete itemIdToExpandedRowMapValues[item.id];
    } else {
      const { group, repeatedValues } = item;
      const expandedTableItems: ChangePoint[] = [];

      pushExpandedTableItem(expandedTableItems, group, true);
      pushExpandedTableItem(expandedTableItems, repeatedValues);

      itemIdToExpandedRowMapValues[item.id] = (
        <SpikeAnalysisTable
          changePoints={expandedTableItems as ChangePoint[]}
          loading={loading}
          dataViewId={dataViewId}
          isExpandedRow
        />
      );
    }
    setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
  };

  const { application, share, data } = useAiopsAppContext();

  const discoverLocator = useMemo(
    () => share.url.locators.get('DISCOVER_APP_LOCATOR'),
    [share.url.locators]
  );

  const discoverUrlError = useMemo(() => {
    if (!application.capabilities.discover?.show) {
      const discoverNotEnabled = i18n.translate(
        'xpack.aiops.spikeAnalysisTable.discoverNotEnabledErrorMessage',
        {
          defaultMessage: 'Discover is not enabled',
        }
      );

      return discoverNotEnabled;
    }
    if (!discoverLocator) {
      const discoverLocatorMissing = i18n.translate(
        'xpack.aiops.spikeAnalysisTable.discoverLocatorMissingErrorMessage',
        {
          defaultMessage: 'No locator for Discover detected',
        }
      );

      return discoverLocatorMissing;
    }
    if (!dataViewId) {
      const autoGeneratedDiscoverLinkError = i18n.translate(
        'xpack.aiops.spikeAnalysisTable.autoGeneratedDiscoverLinkErrorMessage',
        {
          defaultMessage: 'Unable to link to Discover; no data view exists for this index',
        }
      );

      return autoGeneratedDiscoverLinkError;
    }
  }, [application.capabilities.discover?.show, dataViewId, discoverLocator]);

  const generateDiscoverUrl = async (groupTableItem: GroupTableItem) => {
    if (discoverLocator !== undefined) {
      const url = await discoverLocator.getRedirectUrl({
        indexPatternId: dataViewId,
        timeRange: data.query.timefilter.timefilter.getTime(),
        filters: data.query.filterManager.getFilters(),
        query: {
          language: SEARCH_QUERY_LANGUAGE.KUERY,
          query: [
            ...groupTableItem.group.map(
              ({ fieldName, fieldValue }) =>
                `${escapeKuery(fieldName)}:${escapeKuery(String(fieldValue))}`
            ),
            ...groupTableItem.repeatedValues.map(
              ({ fieldName, fieldValue }) =>
                `${escapeKuery(fieldName)}:${escapeKuery(String(fieldValue))}`
            ),
          ].join(' AND '),
        },
      });

      return url;
    }
  };

  const columns: Array<EuiBasicTableColumn<GroupTableItem>> = [
    {
      align: RIGHT_ALIGNMENT,
      width: EXPAND_COLUMN_WIDTH,
      isExpander: true,
      name: (
        <EuiScreenReaderOnly>
          <span>Expand rows</span>
        </EuiScreenReaderOnly>
      ),
      render: (item: GroupTableItem) => (
        <EuiButtonIcon
          data-test-subj={'aiopsSpikeAnalysisGroupsTableRowExpansionButton'}
          onClick={() => toggleDetails(item)}
          aria-label={
            itemIdToExpandedRowMap[item.id]
              ? i18n.translate(
                  'xpack.aiops.explainLogRateSpikes.spikeAnalysisTable.collapseAriaLabel',
                  {
                    defaultMessage: 'Collapse',
                  }
                )
              : i18n.translate(
                  'xpack.aiops.explainLogRateSpikes.spikeAnalysisTable.expandAriaLabel',
                  {
                    defaultMessage: 'Expand',
                  }
                )
          }
          iconType={itemIdToExpandedRowMap[item.id] ? 'arrowDown' : 'arrowRight'}
        />
      ),
      valign: 'top',
    },
    {
      'data-test-subj': 'aiopsSpikeAnalysisGroupsTableColumnGroup',
      field: 'group',
      name: (
        <EuiToolTip
          position="top"
          content={i18n.translate(
            'xpack.aiops.explainLogRateSpikes.spikeAnalysisTableGroups.groupColumnTooltip',
            {
              defaultMessage:
                'Displays field/value pairs unique to the group. Expand row to see all field/value pairs.',
            }
          )}
        >
          <>
            <FormattedMessage
              id="xpack.aiops.explainLogRateSpikes.spikeAnalysisTableGroups.groupLabel"
              defaultMessage="Group"
            />
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </>
        </EuiToolTip>
      ),
      render: (_, { group, repeatedValues }) => {
        const valuesBadges = [];
        const hasExtraBadges = group.length > MAX_GROUP_BADGES;

        for (const groupItem of group) {
          const { fieldName, fieldValue } = groupItem;
          if (valuesBadges.length === MAX_GROUP_BADGES) break;
          valuesBadges.push(
            <>
              <EuiBadge
                key={`${fieldName}-id`}
                data-test-subj="aiopsSpikeAnalysisTableColumnGroupBadge"
                color="hollow"
              >
                <span>{`${fieldName}: `}</span>
                <span style={{ color: visColors[2] }}>{`${fieldValue}`}</span>
              </EuiBadge>
              <EuiSpacer size="xs" />
            </>
          );
        }
        if (repeatedValues.length > 0 || hasExtraBadges) {
          valuesBadges.push(
            <>
              <EuiBadge
                key={`$more-id`}
                data-test-subj="aiopsSpikeAnalysisGroupsTableColumnGroupBadge"
                color="hollow"
              >
                {hasExtraBadges ? (
                  <>
                    <FormattedMessage
                      id="xpack.aiops.explainLogRateSpikes.spikeAnalysisTableGroups.moreLabel"
                      defaultMessage="+{count, plural, one {# more field/value pair} other {# more field/value pairs}}"
                      values={{ count: group.length - MAX_GROUP_BADGES }}
                    />
                    <br />
                  </>
                ) : null}
                {repeatedValues.length > 0 ? (
                  <FormattedMessage
                    id="xpack.aiops.explainLogRateSpikes.spikeAnalysisTableGroups.moreRepeatedLabel"
                    defaultMessage="+{count, plural, one {# more field/value pair} other {# more field/value pairs}} also appearing in other groups"
                    values={{ count: repeatedValues.length }}
                  />
                ) : null}
              </EuiBadge>
              <EuiSpacer size="xs" />
            </>
          );
        }
        return valuesBadges;
      },
      sortable: false,
      textOnly: true,
      valign: 'top',
    },
    {
      'data-test-subj': 'aiopsSpikeAnalysisGroupsTableColumnLogRate',
      width: NARROW_COLUMN_WIDTH,
      field: 'pValue',
      name: (
        <EuiToolTip
          position="top"
          content={i18n.translate(
            'xpack.aiops.explainLogRateSpikes.spikeAnalysisTableGroups.logRateColumnTooltip',
            {
              defaultMessage:
                'A visual representation of the impact of the group on the message rate difference',
            }
          )}
        >
          <>
            <FormattedMessage
              id="xpack.aiops.explainLogRateSpikes.spikeAnalysisTableGroups.logRateLabel"
              defaultMessage="Log rate"
            />
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </>
        </EuiToolTip>
      ),
      render: (_, { histogram, id }) => (
        <MiniHistogram
          chartData={histogram}
          isLoading={loading && histogram === undefined}
          label={i18n.translate(
            'xpack.aiops.explainLogRateSpikes.spikeAnalysisTableGroups.groupLabel',
            {
              defaultMessage: 'Group',
            }
          )}
        />
      ),
      sortable: false,
      valign: 'top',
    },
    {
      'data-test-subj': 'aiopsSpikeAnalysisGroupsTableColumnDocCount',
      width: NARROW_COLUMN_WIDTH,
      field: 'docCount',
      name: i18n.translate('xpack.aiops.correlations.spikeAnalysisTableGroups.docCountLabel', {
        defaultMessage: 'Doc count',
      }),
      sortable: true,
      valign: 'top',
    },
    {
      'data-test-subj': 'aiopsSpikeAnalysisGroupsTableColumnPValue',
      width: NARROW_COLUMN_WIDTH,
      field: 'pValue',
      name: (
        <EuiToolTip
          position="top"
          content={i18n.translate(
            'xpack.aiops.explainLogRateSpikes.spikeAnalysisTableGroups.pValueColumnTooltip',
            {
              defaultMessage:
                'The significance of changes in the frequency of values; lower values indicate greater change',
            }
          )}
        >
          <>
            <FormattedMessage
              id="xpack.aiops.explainLogRateSpikes.spikeAnalysisTableGroups.pValueLabel"
              defaultMessage="p-value"
            />
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </>
        </EuiToolTip>
      ),
      render: (pValue: number | null) => pValue?.toPrecision(3) ?? NOT_AVAILABLE,
      sortable: true,
      valign: 'top',
    },
    {
      'data-test-subj': 'aiopsSpikeAnalysisTableColumnImpact',
      width: NARROW_COLUMN_WIDTH,
      field: 'pValue',
      name: (
        <EuiToolTip
          position="top"
          content={i18n.translate(
            'xpack.aiops.explainLogRateSpikes.spikeAnalysisTableGroups.impactLabelColumnTooltip',
            {
              defaultMessage: 'The level of impact of the group on the message rate difference',
            }
          )}
        >
          <>
            <FormattedMessage
              id="xpack.aiops.explainLogRateSpikes.spikeAnalysisTable.impactLabel"
              defaultMessage="Impact"
            />
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </>
        </EuiToolTip>
      ),
      render: (_, { pValue }) => {
        if (!pValue) return NOT_AVAILABLE;
        const label = getFailedTransactionsCorrelationImpactLabel(pValue);
        return label ? <EuiBadge color={label.color}>{label.impact}</EuiBadge> : null;
      },
      sortable: true,
      valign: 'top',
    },
    {
      'data-test-subj': 'aiOpsSpikeAnalysisTableColumnAction',
      name: i18n.translate('xpack.aiops.spikeAnalysisTable.actionsColumnName', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          name: () => (
            <EuiToolTip content={discoverUrlError ? discoverUrlError : viewInDiscoverMessage}>
              <EuiIcon type="discoverApp" />
            </EuiToolTip>
          ),
          description: viewInDiscoverMessage,
          type: 'button',
          onClick: async (tableItem) => {
            const openInDiscoverUrl = await generateDiscoverUrl(tableItem);
            if (typeof openInDiscoverUrl === 'string') {
              await application.navigateToUrl(openInDiscoverUrl);
            }
          },
          enabled: () => discoverUrlError === undefined,
        },
      ],
      width: ACTIONS_COLUMN_WIDTH,
      valign: 'top',
    },
  ];

  const onChange = useCallback((tableSettings) => {
    const { index, size } = tableSettings.page;
    const { field, direction } = tableSettings.sort;

    setPageIndex(index);
    setPageSize(size);
    setSortField(field);
    setSortDirection(direction);
  }, []);

  const { pagination, pageOfItems, sorting } = useMemo(() => {
    const pageStart = pageIndex * pageSize;
    const itemCount = groupTableItems?.length ?? 0;

    let items = groupTableItems ?? [];
    items = sortBy(groupTableItems, (item) => {
      if (item && typeof item[sortField] === 'string') {
        // @ts-ignore Object is possibly null or undefined
        return item[sortField].toLowerCase();
      }
      return item[sortField];
    });
    items = sortDirection === 'asc' ? items : items.reverse();

    return {
      pageOfItems: items.slice(pageStart, pageStart + pageSize),
      pagination: {
        pageIndex,
        pageSize,
        totalItemCount: itemCount,
        pageSizeOptions: PAGINATION_SIZE_OPTIONS,
      },
      sorting: {
        sort: {
          field: sortField,
          direction: sortDirection,
        },
      },
    };
  }, [pageIndex, pageSize, sortField, sortDirection, groupTableItems]);

  const getRowStyle = (group: GroupTableItem) => {
    if (pinnedGroup && pinnedGroup.id === group.id) {
      return {
        backgroundColor: primaryBackgroundColor,
      };
    }

    if (selectedGroup && selectedGroup.id === group.id) {
      return {
        backgroundColor: euiTheme.colors.lightestShade,
      };
    }

    return {
      backgroundColor: euiTheme.colors.emptyShade,
    };
  };

  return (
    <EuiBasicTable
      data-test-subj="aiopsSpikeAnalysisGroupsTable"
      compressed
      columns={columns}
      items={pageOfItems}
      itemId="id"
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      onChange={onChange}
      pagination={pagination}
      loading={false}
      sorting={sorting as EuiTableSortingType<GroupTableItem>}
      rowProps={(group) => {
        return {
          'data-test-subj': `aiopsSpikeAnalysisGroupsTableRow row-${group.id}`,
          onClick: () => {
            if (group.id === pinnedGroup?.id) {
              setPinnedGroup(null);
            } else {
              setPinnedGroup(group);
            }
          },
          onMouseEnter: () => {
            setSelectedGroup(group);
          },
          onMouseLeave: () => {
            setSelectedGroup(null);
          },
          style: getRowStyle(group),
        };
      }}
    />
  );
};
