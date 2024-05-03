/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import type { Category } from '@kbn/aiops-log-pattern-analysis/types';
import type { DataViewField } from '@kbn/data-views-plugin/common';

import type { OpenInDiscover } from '../category_table/use_open_in_discover';
import { OpenInDiscoverButtons } from '../category_table/table_header';
import { EmbeddableMenu } from './embeddable_menu';
import type { RandomSampler } from '../sampling_menu';
import type { MinimumTimeRangeOption } from './minimum_time_range';

interface Props {
  viewModeToggle: (patternCount?: number) => React.ReactElement;
  randomSampler: RandomSampler;
  openInDiscover: OpenInDiscover;
  selectedCategories: Category[];
  loadCategories: () => void;
  fields: DataViewField[];
  setSelectedField: React.Dispatch<React.SetStateAction<DataViewField | null>>;
  selectedField: DataViewField | null;
  minimumTimeRangeOption: MinimumTimeRangeOption;
  setMinimumTimeRangeOption: (w: MinimumTimeRangeOption) => void;
  data: {
    categories: Category[];
    displayExamples: boolean;
    totalCategories: number;
  } | null;
}

export const DiscoverTabs: FC<Props> = ({
  viewModeToggle,
  randomSampler,
  openInDiscover,
  selectedCategories,
  loadCategories,
  fields,
  setSelectedField,
  selectedField,
  minimumTimeRangeOption,
  setMinimumTimeRangeOption,
  data,
}) => {
  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem grow={false}>{viewModeToggle(data?.categories.length)}</EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <>
            {randomSampler !== undefined ? (
              <>
                <EuiSpacer size="s" />
                <EuiFlexGroup gutterSize="none">
                  {selectedCategories.length > 0 ? (
                    <EuiFlexItem>
                      <OpenInDiscoverButtons openInDiscover={openInDiscover} showText={false} />
                    </EuiFlexItem>
                  ) : null}
                  <EuiFlexItem>
                    <EmbeddableMenu
                      randomSampler={randomSampler}
                      reload={() => loadCategories()}
                      fields={fields}
                      setSelectedField={setSelectedField}
                      selectedField={selectedField}
                      minimumTimeRangeOption={minimumTimeRangeOption}
                      setMinimumTimeRangeOption={setMinimumTimeRangeOption}
                      categoryCount={data?.totalCategories}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            ) : null}
          </>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
