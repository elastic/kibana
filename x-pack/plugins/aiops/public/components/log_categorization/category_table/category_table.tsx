/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo, useState } from 'react';

import type { EuiBasicTableColumn, EuiTableSelectionType } from '@elastic/eui';
import {
  useEuiBackgroundColor,
  EuiInMemoryTable,
  EuiHorizontalRule,
  EuiSpacer,
  EuiButtonIcon,
  EuiToolTip,
  EuiIcon,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import { useTableState } from '@kbn/ml-in-memory-table';

import moment from 'moment';
import type { CategorizationAdditionalFilter } from '../../../../common/api/log_categorization/create_category_request';
import {
  type QueryMode,
  QUERY_MODE,
} from '../../../../common/api/log_categorization/get_category_query';
import type { Category } from '../../../../common/api/log_categorization/types';

import { useEuiTheme } from '../../../hooks/use_eui_theme';
import type { LogCategorizationAppState } from '../../../application/url_state/log_pattern_analysis';

import { MiniHistogram } from '../../mini_histogram';

import { useDiscoverLinks, createFilter } from '../use_discover_links';
import type { EventRate } from '../use_categorize_request';

import { getLabels } from './labels';
import { TableHeader } from './table_header';
import { ExpandedRow } from './expanded_row';
import { FormattedPatternExamples, FormattedTokens } from '../format_category';

interface Props {
  categories: Category[];
  eventRate: EventRate;
  dataViewId: string;
  selectedField: DataViewField | string | undefined;
  timefilter: TimefilterContract;
  aiopsListState: LogCategorizationAppState;
  pinnedCategory: Category | null;
  setPinnedCategory: (category: Category | null) => void;
  selectedCategory: Category | null;
  setSelectedCategory: (category: Category | null) => void;
  onAddFilter?: (values: Filter, alias?: string) => void;
  onClose?: () => void;
  enableRowActions?: boolean;
  additionalFilter?: CategorizationAdditionalFilter;
  navigateToDiscover?: boolean;
  displayExamples?: boolean;
}

export const CategoryTable: FC<Props> = ({
  categories,
  eventRate,
  dataViewId,
  selectedField,
  timefilter,
  aiopsListState,
  pinnedCategory,
  setPinnedCategory,
  selectedCategory,
  setSelectedCategory,
  onAddFilter,
  onClose = () => {},
  enableRowActions = true,
  additionalFilter,
  navigateToDiscover = true,
  displayExamples = true,
}) => {
  const euiTheme = useEuiTheme();
  const primaryBackgroundColor = useEuiBackgroundColor('primary');
  const { openInDiscoverWithFilter } = useDiscoverLinks();
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const { onTableChange, pagination, sorting } = useTableState<Category>(categories ?? [], 'key');
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, JSX.Element>>(
    {}
  );

  const labels = useMemo(() => {
    const isFlyout = onAddFilter !== undefined && onClose !== undefined;
    return getLabels(isFlyout && navigateToDiscover === false);
  }, [navigateToDiscover, onAddFilter, onClose]);

  const showSparkline = useMemo(() => {
    return categories.some((category) => category.sparkline !== undefined);
  }, [categories]);

  const openInDiscover = (mode: QueryMode, category?: Category) => {
    if (
      onAddFilter !== undefined &&
      selectedField !== undefined &&
      typeof selectedField !== 'string' &&
      navigateToDiscover === false
    ) {
      onAddFilter(
        createFilter('', selectedField.name, selectedCategories, mode, category),
        `Patterns - ${selectedField.name}`
      );
      onClose();
      return;
    }

    const timefilterActiveBounds =
      additionalFilter !== undefined
        ? {
            min: moment(additionalFilter.from),
            max: moment(additionalFilter.to),
          }
        : timefilter.getActiveBounds();

    if (timefilterActiveBounds === undefined || selectedField === undefined) {
      return;
    }

    openInDiscoverWithFilter(
      dataViewId,
      typeof selectedField === 'string' ? selectedField : selectedField.name,
      selectedCategories,
      aiopsListState,
      timefilterActiveBounds,
      mode,
      category,
      additionalFilter?.field
    );
  };

  const toggleDetails = useCallback(
    (category: Category) => {
      const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
      if (itemIdToExpandedRowMapValues[category.key]) {
        delete itemIdToExpandedRowMapValues[category.key];
      } else {
        itemIdToExpandedRowMapValues[category.key] = (
          <ExpandedRow category={category} displayExamples={displayExamples} />
        );
      }
      setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
    },
    [displayExamples, itemIdToExpandedRowMap]
  );

  const columns: Array<EuiBasicTableColumn<Category>> = [
    {
      align: 'left',
      width: '40px',
      isExpander: true,
      render: (item: Category) => (
        <EuiButtonIcon
          data-test-subj="aiopsLogPatternsColumnsButton"
          onClick={() => toggleDetails(item)}
          aria-label={
            itemIdToExpandedRowMap[item.key]
              ? i18n.translate('xpack.aiops.logCategorization.column.collapseRow', {
                  defaultMessage: 'Collapse',
                })
              : i18n.translate('xpack.aiops.logCategorization.column.expandRow', {
                  defaultMessage: 'Expand',
                })
          }
          iconType={itemIdToExpandedRowMap[item.key] ? 'arrowDown' : 'arrowRight'}
        />
      ),
      'data-test-subj': 'aiopsLogPatternsExpandRowToggle',
    },
    {
      field: 'count',
      name: i18n.translate('xpack.aiops.logCategorization.column.count', {
        defaultMessage: 'Count',
      }),
      sortable: true,
      width: '80px',
    },
    {
      name: i18n.translate('xpack.aiops.logCategorization.column.examples', {
        defaultMessage: 'Examples',
      }),
      sortable: true,
      render: (item: Category) => <FormattedPatternExamples category={item} count={1} />,
    },
    {
      name: i18n.translate('xpack.aiops.logCategorization.column.actions', {
        defaultMessage: 'Actions',
      }),
      sortable: false,
      width: '60px',
      actions: [
        {
          name: labels.singleSelect.in,
          description: labels.singleSelect.in,
          icon: 'plusInCircle',
          type: 'icon',
          'data-test-subj': 'aiopsLogPatternsActionFilterInButton',
          onClick: (category) => openInDiscover(QUERY_MODE.INCLUDE, category),
        },
        {
          name: labels.singleSelect.out,
          description: labels.singleSelect.out,
          icon: 'minusInCircle',
          type: 'icon',
          'data-test-subj': 'aiopsLogPatternsActionFilterOutButton',
          onClick: (category) => openInDiscover(QUERY_MODE.EXCLUDE, category),
        },
      ],
    },
  ] as Array<EuiBasicTableColumn<Category>>;

  if (displayExamples === false) {
    // on the rare occasion that examples are not available, replace the examples column with tokens
    columns.splice(2, 1, {
      name: (
        <EuiToolTip
          position="top"
          content={i18n.translate('xpack.aiops.logCategorization.column.tokens.tooltip', {
            defaultMessage:
              'If the selected field is an alias, example documents cannot be displayed. Showing pattern tokens instead.',
          })}
        >
          <>
            {i18n.translate('xpack.aiops.logCategorization.column.tokens', {
              defaultMessage: 'Tokens',
            })}
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </>
        </EuiToolTip>
      ),
      render: (item: Category) => <FormattedTokens category={item} count={1} />,
    });
  }

  if (showSparkline === true) {
    columns.splice(2, 0, {
      field: 'sparkline',
      name: i18n.translate('xpack.aiops.logCategorization.column.logRate', {
        defaultMessage: 'Log rate',
      }),
      sortable: false,
      width: '100px',
      render: (sparkline: Category['sparkline']) => {
        if (sparkline === undefined) {
          return null;
        }
        const histogram = eventRate.map(({ key: catKey, docCount }) => {
          const term = sparkline[catKey] ?? 0;
          const newTerm = term > docCount ? docCount : term;
          const adjustedDocCount = docCount - newTerm;

          return {
            doc_count_overall: adjustedDocCount,
            doc_count_significant_item: newTerm,
            key: catKey,
            key_as_string: `${catKey}`,
          };
        });

        return (
          <MiniHistogram
            chartData={histogram}
            isLoading={categories === null && histogram === undefined}
            label={''}
          />
        );
      },
    });
  }

  const selectionValue: EuiTableSelectionType<Category> | undefined = {
    selectable: () => true,
    onSelectionChange: (selectedItems) => setSelectedCategories(selectedItems),
  };

  const getRowStyle = (category: Category) => {
    if (
      pinnedCategory &&
      pinnedCategory.key === category.key &&
      pinnedCategory.key === category.key
    ) {
      return {
        backgroundColor: primaryBackgroundColor,
      };
    }

    if (selectedCategory && selectedCategory.key === category.key) {
      return {
        backgroundColor: euiTheme.euiColorLightestShade,
      };
    }

    return {
      backgroundColor: euiTheme.euiColorEmptyShade,
    };
  };

  return (
    <>
      <TableHeader
        categoriesCount={categories.length}
        selectedCategoriesCount={selectedCategories.length}
        labels={labels}
        openInDiscover={(queryMode: QueryMode) => openInDiscover(queryMode)}
      />
      <EuiSpacer size="xs" />
      <EuiHorizontalRule margin="none" />

      <EuiInMemoryTable<Category>
        compressed
        items={categories}
        columns={columns}
        isSelectable={true}
        selection={selectionValue}
        itemId="key"
        onTableChange={onTableChange}
        pagination={pagination}
        sorting={sorting}
        data-test-subj="aiopsLogPatternsTable"
        isExpandable={true}
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        rowProps={(category) => {
          return enableRowActions
            ? {
                onClick: () => {
                  if (category.key === pinnedCategory?.key) {
                    setPinnedCategory(null);
                  } else {
                    setPinnedCategory(category);
                  }
                },
                onMouseEnter: () => {
                  setSelectedCategory(category);
                },
                onMouseLeave: () => {
                  setSelectedCategory(null);
                },
                style: getRowStyle(category),
              }
            : undefined;
        }}
      />
    </>
  );
};
