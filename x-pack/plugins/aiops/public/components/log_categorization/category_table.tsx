/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import {
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

import { useDiscoverLinks } from './use_discover_links';
import { MiniHistogram } from '../mini_histogram';
import { useEuiTheme } from '../../hooks/use_eui_theme';
import type { AiOpsIndexBasedAppState } from '../explain_log_rate_spikes/explain_log_rate_spikes_app_state';
import type { EventRate, Category, SparkLinesPerCategory } from './use_categorize_request';

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
  const { openInDiscoverWithFilter } = useDiscoverLinks();
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);

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

  const columns = [
    {
      field: 'count',
      name: 'Count',
      sortable: true,
      width: '80px',
    },
    {
      field: 'count',
      name: 'Sparkline',
      sortable: true,
      width: '100px',
      render: (_, { key }) => {
        const gg = sparkLines[key];
        if (gg === undefined) {
          return null;
        }
        const histogram = eventRate.map((e) => ({
          doc_count_overall: e.docCount,
          doc_count_change_point: gg[e.key],
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
      name: 'Examples',
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
      name: '',
      width: 40,
      actions: [
        {
          name: 'Show these in discover',
          icon: 'filter',
          type: 'icon',
          onClick: (category) => openInDiscover(QUERY_MODE.INCLUDE, category),
        },
        {
          name: 'Filter out in discover',
          icon: 'filter',
          type: 'icon',
          onClick: (category) => openInDiscover(QUERY_MODE.EXCLUDE, category),
        },
        {
          name: 'Open in data visualizer',
          icon: 'stats',
          type: 'icon',
          onClick: () => {},
        },
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
        backgroundColor: 'rgb(227,240,249,0.37)',
      };
    }

    if (
      selectedCategory &&
      selectedCategory.key === category.key &&
      selectedCategory.key === category.key
    ) {
      return {
        backgroundColor: euiTheme.euiColorLightestShade,
      };
    }

    return {
      backgroundColor: 'white',
    };
  };

  return (
    <>
      {selectedCategories.length > 0 ? (
        <>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButton size="s" onClick={() => openInDiscover(QUERY_MODE.EXCLUDE)}>
                Filter out in discover
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton size="s" onClick={() => openInDiscover(QUERY_MODE.INCLUDE)}>
                Show these in discover
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
