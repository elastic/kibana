/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import {
  useEuiBackgroundColor,
  EuiInMemoryTable,
  EuiBasicTableColumn,
  EuiCode,
  EuiText,
  EuiTableSelectionType,
  EuiHorizontalRule,
  EuiSpacer,
} from '@elastic/eui';

import { DataViewField } from '@kbn/data-views-plugin/common';
import { Filter } from '@kbn/es-query';
import { useDiscoverLinks, createFilter, QueryMode, QUERY_MODE } from '../use_discover_links';
import { MiniHistogram } from '../../mini_histogram';
import { useEuiTheme } from '../../../hooks/use_eui_theme';
import type { AiOpsFullIndexBasedAppState } from '../../../application/utils/url_state';
import type { EventRate, Category, SparkLinesPerCategory } from '../use_categorize_request';
import { useTableState } from './use_table_state';
import { getLabels } from './labels';
import { TableHeader } from './table_header';

interface Props {
  categories: Category[];
  sparkLines: SparkLinesPerCategory;
  eventRate: EventRate;
  dataViewId: string;
  selectedField: DataViewField | string | undefined;
  timefilter: TimefilterContract;
  aiopsListState: AiOpsFullIndexBasedAppState;
  pinnedCategory: Category | null;
  setPinnedCategory: (category: Category | null) => void;
  selectedCategory: Category | null;
  setSelectedCategory: (category: Category | null) => void;
  onAddFilter?: (values: Filter, alias?: string) => void;
  onClose?: () => void;
  enableRowActions?: boolean;
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
  onAddFilter,
  onClose = () => {},
  enableRowActions = true,
}) => {
  const euiTheme = useEuiTheme();
  const primaryBackgroundColor = useEuiBackgroundColor('primary');
  const { openInDiscoverWithFilter } = useDiscoverLinks();
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const { onTableChange, pagination, sorting } = useTableState<Category>(categories ?? [], 'key');

  const labels = useMemo(
    () => getLabels(onAddFilter !== undefined && onClose !== undefined),
    [onAddFilter, onClose]
  );

  const openInDiscover = (mode: QueryMode, category?: Category) => {
    if (
      onAddFilter !== undefined &&
      selectedField !== undefined &&
      typeof selectedField !== 'string'
    ) {
      onAddFilter(
        createFilter('', selectedField.name, selectedCategories, mode, category),
        `Patterns - ${selectedField.name}`
      );
      onClose();
      return;
    }

    const timefilterActiveBounds = timefilter.getActiveBounds();
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
      sortable: false,
      width: '100px',
      render: (_, { key }) => {
        const sparkLine = sparkLines[key];
        if (sparkLine === undefined) {
          return null;
        }
        const histogram = eventRate.map((e) => ({
          doc_count_overall: e.docCount,
          doc_count_significant_term: sparkLine[e.key],
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
      render: (examples: string[]) => (
        <>
          {examples.map((e) => (
            <EuiText size="s" key={e}>
              <EuiCode language="log" transparentBackground css={{ paddingInline: '0px' }}>
                {e}
              </EuiCode>
            </EuiText>
          ))}
        </>
      ),
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
          onClick: (category) => openInDiscover(QUERY_MODE.INCLUDE, category),
        },
        {
          name: labels.singleSelect.out,
          description: labels.singleSelect.out,
          icon: 'minusInCircle',
          type: 'icon',
          onClick: (category) => openInDiscover(QUERY_MODE.EXCLUDE, category),
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
