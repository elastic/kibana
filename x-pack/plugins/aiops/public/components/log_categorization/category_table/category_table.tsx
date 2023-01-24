/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import {
  useEuiBackgroundColor,
  EuiButton,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiBasicTableColumn,
  EuiCode,
  EuiText,
  EuiTableSelectionType,
} from '@elastic/eui';

import { useDiscoverLinks } from '../use_discover_links';
import { MiniHistogram } from '../../mini_histogram';
import { useEuiTheme } from '../../../hooks/use_eui_theme';
import type { AiOpsIndexBasedAppState } from '../../explain_log_rate_spikes/explain_log_rate_spikes_app_state';
import type { EventRate, Category, SparkLinesPerCategory } from '../use_categorize_request';
import { useTableState } from './use_table_state';

const QUERY_MODE = {
  INCLUDE: 'should',
  EXCLUDE: 'must_not',
} as const;
export type QueryMode = typeof QUERY_MODE[keyof typeof QUERY_MODE];

interface Props {
  categories: Category[];
  sparkLines: SparkLinesPerCategory;
  eventRate: EventRate;
  dataViewId: string;
  selectedField: string | undefined;
  timefilter: TimefilterContract;
  aiopsListState: Required<AiOpsIndexBasedAppState>;
  pinnedCategory: Category | null;
  setPinnedCategory: (category: Category | null) => void;
  selectedCategory: Category | null;
  setSelectedCategory: (category: Category | null) => void;
}

export const CategoryTable: FC<Props> = ({
  categories,
  sparkLines,
  eventRate,
  dataViewId,
  selectedField,
  timefilter,
  aiopsListState,
  pinnedCategory,
  setPinnedCategory,
  selectedCategory,
  setSelectedCategory,
}) => {
  const euiTheme = useEuiTheme();
  const primaryBackgroundColor = useEuiBackgroundColor('primary');
  const { openInDiscoverWithFilter } = useDiscoverLinks();
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const { onTableChange, pagination, sorting } = useTableState<Category>(categories ?? [], 'key');

  const openInDiscover = (mode: QueryMode, category?: Category) => {
    const timefilterActiveBounds = timefilter.getActiveBounds();
    if (timefilterActiveBounds === undefined || selectedField === undefined) {
      return;
    }

    openInDiscoverWithFilter(
      dataViewId,
      selectedField,
      selectedCategories,
      aiopsListState,
      timefilterActiveBounds,
      mode,
      category
    );
  };

  const columns: Array<EuiBasicTableColumn<Category>> = [
    {
      field: 'count',
      name: i18n.translate('xpack.aiops.logCategorization.column.count', {
        defaultMessage: 'Count',
      }),
      sortable: true,
      width: '80px',
    },
    {
      field: 'count',
      name: i18n.translate('xpack.aiops.logCategorization.column.logRate', {
        defaultMessage: 'Log rate',
      }),
      sortable: true,
      width: '100px',
      render: (_, { key }) => {
        const sparkLine = sparkLines[key];
        if (sparkLine === undefined) {
          return null;
        }
        const histogram = eventRate.map((e) => ({
          doc_count_overall: e.docCount,
          doc_count_change_point: sparkLine[e.key],
          key: e.key,
          key_as_string: `${e.key}`,
        }));

        return (
          <MiniHistogram
            chartData={histogram}
            isLoading={categories === null && histogram === undefined}
            label={''}
          />
        );
      },
    },
    {
      field: 'examples',
      name: i18n.translate('xpack.aiops.logCategorization.column.examples', {
        defaultMessage: 'Examples',
      }),
      sortable: true,
      style: { display: 'block' },
      render: (examples: string[]) => (
        <div style={{ display: 'block' }}>
          {examples.map((e) => (
            <>
              <EuiText size="s">
                <EuiCode language="log" transparentBackground>
                  {e}
                </EuiCode>
              </EuiText>
              <EuiSpacer size="s" />
            </>
          ))}
        </div>
      ),
    },
    {
      name: 'Actions',
      width: '60px',
      actions: [
        {
          name: i18n.translate('xpack.aiops.logCategorization.showInDiscover', {
            defaultMessage: 'Show these in Discover',
          }),
          description: i18n.translate('xpack.aiops.logCategorization.showInDiscover', {
            defaultMessage: 'Show these in Discover',
          }),
          icon: 'discoverApp',
          type: 'icon',
          onClick: (category) => openInDiscover(QUERY_MODE.INCLUDE, category),
        },
        {
          name: i18n.translate('xpack.aiops.logCategorization.filterOutInDiscover', {
            defaultMessage: 'Filter out in Discover',
          }),
          description: i18n.translate('xpack.aiops.logCategorization.filterOutInDiscover', {
            defaultMessage: 'Filter out in Discover',
          }),
          icon: 'filter',
          type: 'icon',
          onClick: (category) => openInDiscover(QUERY_MODE.EXCLUDE, category),
        },
        // Disabled for now
        // {
        //   name: i18n.translate('xpack.aiops.logCategorization.openInDataViz', {
        //     defaultMessage: 'Open in data visualizer',
        //   }),
        //   icon: 'stats',
        //   type: 'icon',
        //   onClick: () => {},
        // },
      ],
    },
  ] as Array<EuiBasicTableColumn<Category>>;

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
      {selectedCategories.length > 0 ? (
        <>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButton size="s" onClick={() => openInDiscover(QUERY_MODE.INCLUDE)}>
                <FormattedMessage
                  id="xpack.aiops.logCategorization.showInDiscover"
                  defaultMessage="Show these in Discover"
                />
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton size="s" onClick={() => openInDiscover(QUERY_MODE.EXCLUDE)}>
                <FormattedMessage
                  id="xpack.aiops.logCategorization.filterOutInDiscover"
                  defaultMessage="Filter out in Discover"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : null}
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
        rowProps={(category) => {
          return {
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
          };
        }}
      />
    </>
  );
};
