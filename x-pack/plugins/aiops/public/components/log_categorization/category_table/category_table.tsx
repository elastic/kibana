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
  EuiButtonIcon,
  EuiToolTip,
  EuiIcon,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import type { UseTableState } from '@kbn/ml-in-memory-table';

import { css } from '@emotion/react';
import { QUERY_MODE } from '@kbn/aiops-log-pattern-analysis/get_category_query';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';

import { useEuiTheme } from '../../../hooks/use_eui_theme';

import { MiniHistogram } from '../../mini_histogram';

import type { EventRate } from '../use_categorize_request';

import { ExpandedRow } from './expanded_row';
import { FormattedPatternExamples, FormattedTokens } from '../format_category';
import type { OpenInDiscover } from './use_open_in_discover';

interface Props {
  categories: Category[];
  eventRate: EventRate;
  pinnedCategory: Category | null;
  setPinnedCategory: (category: Category | null) => void;
  highlightedCategory: Category | null;
  setHighlightedCategory: (category: Category | null) => void;
  setSelectedCategories: (category: Category[]) => void;
  openInDiscover: OpenInDiscover;
  tableState: UseTableState<Category>;
  enableRowActions?: boolean;
  displayExamples?: boolean;
}

export const CategoryTable: FC<Props> = ({
  categories,
  eventRate,
  pinnedCategory,
  setPinnedCategory,
  highlightedCategory,
  setHighlightedCategory,
  setSelectedCategories,
  openInDiscover,
  tableState,
  enableRowActions = true,
  displayExamples = true,
}) => {
  const euiTheme = useEuiTheme();
  const primaryBackgroundColor = useEuiBackgroundColor('primary');
  const { onTableChange, pagination, sorting } = tableState;

  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, JSX.Element>>(
    {}
  );

  const showSparkline = useMemo(() => {
    return categories.some((category) => category.sparkline !== undefined);
  }, [categories]);

  const { labels: openInDiscoverLabels, openFunction: openInDiscoverFunction } = openInDiscover;

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
      width: '65px',
      actions: [
        {
          name: openInDiscoverLabels.singleSelect.in,
          description: openInDiscoverLabels.singleSelect.in,
          icon: 'plusInCircle',
          type: 'icon',
          'data-test-subj': 'aiopsLogPatternsActionFilterInButton',
          onClick: (category) => openInDiscoverFunction(QUERY_MODE.INCLUDE, category),
        },
        {
          name: openInDiscoverLabels.singleSelect.out,
          description: openInDiscoverLabels.singleSelect.out,
          icon: 'minusInCircle',
          type: 'icon',
          'data-test-subj': 'aiopsLogPatternsActionFilterOutButton',
          onClick: (category) => openInDiscoverFunction(QUERY_MODE.EXCLUDE, category),
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

    if (highlightedCategory && highlightedCategory.key === category.key) {
      return {
        backgroundColor: euiTheme.euiColorLightestShade,
      };
    }

    return {
      backgroundColor: euiTheme.euiColorEmptyShade,
    };
  };

  const tableStyle = css({
    thead: {
      position: 'sticky',
      insetBlockStart: 0,
      zIndex: 1,
      backgroundColor: euiTheme.euiColorEmptyShade,
      boxShadow: `inset 0 0px 0, inset 0 -1px 0 ${euiTheme.euiBorderColor}`,
    },
  });

  return (
    <EuiInMemoryTable<Category>
      compressed
      items={categories}
      columns={columns}
      selection={selectionValue}
      itemId="key"
      onTableChange={onTableChange}
      pagination={pagination}
      sorting={sorting}
      data-test-subj="aiopsLogPatternsTable"
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      css={tableStyle}
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
                setHighlightedCategory(category);
              },
              onMouseLeave: () => {
                setHighlightedCategory(null);
              },
              style: getRowStyle(category),
            }
          : undefined;
      }}
    />
  );
};
