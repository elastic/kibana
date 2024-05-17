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
import type { DataViewField, DataView } from '@kbn/data-views-plugin/common';

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { OpenInDiscover } from '../category_table/use_open_in_discover';
import { EmbeddableMenu } from './embeddable_menu';
import type { RandomSampler } from '../sampling_menu';
import type { MinimumTimeRangeOption } from './minimum_time_range';
import { SelectedPatterns } from './selected_patterns';
import { CreateCategorizationJobButton } from '../create_categorization_job';
import { SelectedField } from './field_selector';

interface Props {
  renderViewModeToggle: (patternCount?: number) => React.ReactElement;
  randomSampler: RandomSampler;
  openInDiscover: OpenInDiscover;
  selectedCategories: Category[];
  loadCategories: () => void;
  fields: DataViewField[];
  setSelectedField: React.Dispatch<React.SetStateAction<DataViewField | null>>;
  selectedField: DataViewField | null;
  minimumTimeRangeOption: MinimumTimeRangeOption;
  setMinimumTimeRangeOption: (w: MinimumTimeRangeOption) => void;
  dataview: DataView;
  earliest: number | undefined;
  latest: number | undefined;
  query: QueryDslQueryContainer;
  data: {
    categories: Category[];
    displayExamples: boolean;
    totalCategories: number;
  } | null;
}

export const DiscoverTabs: FC<Props> = ({
  renderViewModeToggle,
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
  dataview,
  earliest,
  latest,
  query,
}) => {
  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem grow={false}>{renderViewModeToggle(data?.categories.length)}</EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="s" responsive={false}>
              {selectedCategories.length > 0 ? (
                <EuiFlexItem>
                  <SelectedPatterns openInDiscover={openInDiscover} />
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem>
                <SelectedField
                  fields={fields}
                  setSelectedField={setSelectedField}
                  selectedField={selectedField}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <div className="unifiedDataTableToolbarControlGroup" css={{ marginRight: '8px' }}>
                  <div className="unifiedDataTableToolbarControlIconButton">
                    <EmbeddableMenu
                      randomSampler={randomSampler}
                      reload={() => loadCategories()}
                      minimumTimeRangeOption={minimumTimeRangeOption}
                      setMinimumTimeRangeOption={setMinimumTimeRangeOption}
                      categoryCount={data?.totalCategories}
                    />
                  </div>
                  {selectedField !== null && earliest !== undefined && latest !== undefined ? (
                    <div className="unifiedDataTableToolbarControlIconButton">
                      <CreateCategorizationJobButton
                        dataView={dataview}
                        field={selectedField}
                        query={query}
                        earliest={earliest}
                        latest={latest}
                        iconOnly={true}
                      />
                    </div>
                  ) : null}
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
