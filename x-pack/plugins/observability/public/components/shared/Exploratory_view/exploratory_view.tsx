/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
} from '@elastic/eui';
import { DataPublicPluginStart, IndexPattern } from 'src/plugins/data/public';
import { CoreStart } from 'kibana/public';

import {
  LensPublicStart,
  TypedLensByValueInput,
  PersistedIndexPatternLayer,
  XYState,
} from '../../../../../lens/public';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { ObservabilityClientPluginsStart } from '../../../plugin';
import { useFetcher } from '../../..';

export interface StartDependencies {
  data: DataPublicPluginStart;
  lens: LensPublicStart;
}

const st = {
  type: 'lens',
  id: '921a4d80-7dfc-11eb-99d2-0de5efac9392',
  attributes: {
    title: 'Prefilled from example app',
    description: '',
    visualizationType: 'lnsXY',
    state: {
      datasourceStates: {
        indexpattern: {
          layers: {
            layer1: {
              columnOrder: ['col1', 'col2'],
              columns: {
                col2: {
                  dataType: 'number',
                  isBucketed: false,
                  label: 'Count of records',
                  operationType: 'count',
                  scale: 'ratio',
                  sourceField: 'Records',
                },
                col1: {
                  dataType: 'date',
                  isBucketed: true,
                  label: '@timestamp',
                  operationType: 'date_histogram',
                  params: { interval: 'auto' },
                  scale: 'interval',
                  sourceField: '@timestamp',
                },
              },
            },
          },
        },
      },
      visualization: {
        axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
        fittingFunction: 'None',
        gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
        layers: [
          {
            accessors: ['col2'],
            layerId: 'layer1',
            seriesType: 'bar_stacked',
            xAccessor: 'col1',
            yConfig: [{ forAccessor: 'col2', color: 'green' }],
          },
        ],
        legend: { isVisible: true, position: 'right' },
        preferredSeriesType: 'bar_stacked',
        tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
        valueLabels: 'hide',
      },
      query: { language: 'kuery', query: '' },
      filters: [
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: 'transaction.type',
            params: { query: 'page-load' },
            indexRefName: 'filter-index-pattern-0',
          },
          query: { match_phrase: { 'transaction.type': 'page-load' } },
          $state: { store: 'appState' },
        },
      ],
    },
  },
  references: [
    {
      type: 'index-pattern',
      id: 'apm_static_index_pattern_id',
      name: 'indexpattern-datasource-current-indexpattern',
    },
    {
      type: 'index-pattern',
      id: 'apm_static_index_pattern_id',
      name: 'indexpattern-datasource-layer-layer1',
    },
    { name: 'filter-index-pattern-0', type: 'index-pattern', id: 'apm_static_index_pattern_id' },
    {
      type: 'tag',
      id: '8e96a500-7dfc-11eb-99d2-0de5efac9392',
      name: 'tag-ref-8e96a500-7dfc-11eb-99d2-0de5efac9392',
    },
  ],
  migrationVersion: { lens: '7.12.0' },
  coreMigrationVersion: '8.0.0',
  updated_at: '2021-03-05T21:48:50.136Z',
  version: 'WzM4MCwxXQ==',
  namespaces: ['default'],
};

// Generate a Lens state based on some app-specific input parameters.
// `TypedLensByValueInput` can be used for type-safety - it uses the same interfaces as Lens-internal code.
function getLensAttributes(
  defaultIndexPattern: IndexPattern,
  color: string
): TypedLensByValueInput['attributes'] {
  const dataLayer: PersistedIndexPatternLayer = {
    columnOrder: ['col1', 'col2'],
    columns: {
      col2: {
        dataType: 'number',
        isBucketed: false,
        label: 'Count of records',
        operationType: 'count',
        scale: 'ratio',
        sourceField: 'Records',
      },
      col1: {
        dataType: 'date',
        isBucketed: true,
        label: '@timestamp',
        operationType: 'date_histogram',
        params: { interval: 'auto' },
        scale: 'interval',
        sourceField: defaultIndexPattern.timeFieldName!,
      },
    },
  };

  const xyConfig: XYState = {
    axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
    fittingFunction: 'None',
    gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
    layers: [
      {
        accessors: ['col2'],
        layerId: 'layer1',
        seriesType: 'bar_stacked',
        xAccessor: 'col1',
        yConfig: [{ forAccessor: 'col2', color }],
      },
    ],
    legend: { isVisible: true, position: 'right' },
    preferredSeriesType: 'bar_stacked',
    tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
    valueLabels: 'hide',
  };

  return {
    visualizationType: 'lnsXY',
    title: 'Prefilled from example app',
    references: [
      {
        id: defaultIndexPattern.id!,
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: defaultIndexPattern.id!,
        name: 'indexpattern-datasource-layer-layer1',
        type: 'index-pattern',
      },
    ],
    state: {
      datasourceStates: {
        indexpattern: {
          layers: {
            layer1: dataLayer,
          },
        },
      },
      filters: [
        {
          query: { match_phrase: { 'transaction.type': 'page-load' } },
        },
      ],
      query: { language: 'kuery', query: '' },
      visualization: xyConfig,
    },
  };
}

export const ExploratoryView = (props: {
  core: CoreStart;
  plugins: StartDependencies;
  defaultIndexPattern: IndexPattern | null;
}) => {
  const [color, setColor] = useState('green');

  const {
    services: { lens, data },
  } = useKibana<ObservabilityClientPluginsStart>();

  const { data: defaultIndexPattern } = useFetcher(() => data.indexPatterns.getDefault(), []);

  const LensComponent = lens.EmbeddableComponent;

  return (
    <EuiPage>
      <EuiPageBody style={{ maxWidth: 1200, margin: '0 auto' }}>
        <EuiPageHeader>
          <EuiPageHeaderSection>
            <EuiTitle size="l">
              <h1>Exploratory view</h1>
            </EuiTitle>
          </EuiPageHeaderSection>
        </EuiPageHeader>
        <EuiPageContent>
          <EuiPageContentBody style={{ maxWidth: 800, margin: '0 auto' }}>
            {defaultIndexPattern && defaultIndexPattern.isTimeBased() && (
              <>
                <EuiFlexGroup>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      onClick={() => {
                        // eslint-disable-next-line no-bitwise
                        const newColor = '#' + ((Math.random() * 0xffffff) << 0).toString(16);
                        setColor(newColor);
                      }}
                    >
                      Change color
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      isDisabled={!lens.canUseEditor()}
                      onClick={() => {
                        lens.navigateToPrefilledEditor({
                          id: '',
                          timeRange: {
                            from: '2021-01-18T12:19:28.685Z',
                            to: '2021-01-18T12:26:20.767Z',
                          },
                          attributes: getLensAttributes(defaultIndexPattern!, color),
                        });
                        // eslint-disable-next-line no-bitwise
                        const newColor = '#' + ((Math.random() * 0xffffff) << 0).toString(16);
                        setColor(newColor);
                      }}
                    >
                      Edit
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <LensComponent
                  id=""
                  style={{ height: 500 }}
                  timeRange={{
                    from: '2021-01-18T12:19:28.685Z',
                    to: '2021-01-18T12:26:20.767Z',
                  }}
                  attributes={getLensAttributes(defaultIndexPattern, color)}
                />
              </>
            )}
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
