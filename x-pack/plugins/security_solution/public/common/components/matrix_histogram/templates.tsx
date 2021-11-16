/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { SecuritySolutionTemplate } from '../../../../common/types/matrix_histogram_templates';
import { useSourcererDataView } from '../../containers/sourcerer';
import { useFindTemplates } from '../../hooks/use_find_matrix_histogram_templates';
import { SourcererScopeName } from '../../store/sourcerer/model';

import { Loader } from '../loader';

import { WorkpadTemplates as Component } from './workpad_templates.component';
const temp = () => ({
  title: '',
  description: '',
  visualizationType: 'lnsXY',
  type: 'lens',
  references: [
    {
      type: 'index-pattern',
      id: 'ad53fa40-42f7-11ec-a42d-e31ddad596f0',
      name: 'indexpattern-datasource-current-indexpattern',
    },
    {
      type: 'index-pattern',
      id: 'ad53fa40-42f7-11ec-a42d-e31ddad596f0',
      name: 'indexpattern-datasource-layer-18f901ee-191d-4ec9-a633-cc5413c794bc',
    },
  ],
  state: {
    visualization: {
      yRightExtent: {
        mode: 'full',
      },
      valueLabels: 'hide',
      preferredSeriesType: 'bar_stacked',
      legend: {
        isVisible: true,
        position: 'right',
      },
      layers: [
        {
          layerType: 'data',
          xAccessor: '14156b19-43d2-4986-a597-3a084b9dd612',
          layerId: '18f901ee-191d-4ec9-a633-cc5413c794bc',
          accessors: ['4a38dc1d-fbe9-403d-9ff9-70c4751d7560'],
          seriesType: 'area_stacked',
          showGridlines: false,
          position: 'top',
        },
      ],
      yLeftExtent: {
        mode: 'full',
      },
      title: 'Empty XY chart',
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      indexpattern: {
        layers: {
          '18f901ee-191d-4ec9-a633-cc5413c794bc': {
            columnOrder: [
              '14156b19-43d2-4986-a597-3a084b9dd612',
              '4a38dc1d-fbe9-403d-9ff9-70c4751d7560',
            ],
            columns: {
              '4a38dc1d-fbe9-403d-9ff9-70c4751d7560': {
                sourceField: 'host.name',
                isBucketed: false,
                dataType: 'number',
                scale: 'ratio',
                operationType: 'unique_count',
                label: 'Unique count of host.name',
              },
              '14156b19-43d2-4986-a597-3a084b9dd612': {
                sourceField: '@timestamp',
                isBucketed: true,
                dataType: 'date',
                scale: 'interval',
                operationType: 'date_histogram',
                label: '@timestamp',
                params: {
                  interval: 'auto',
                },
              },
            },
            incompleteColumns: {},
          },
        },
      },
    },
  },
});
function getLensAttributes(color: string): TypedLensByValueInput['attributes'] {
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
        sourceField: '@timestamp',
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
        layerType: 'data',
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
        id: 'ad53fa40-42f7-11ec-a42d-e31ddad596f0',
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'ad53fa40-42f7-11ec-a42d-e31ddad596f0',
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
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: xyConfig,
    },
  };
}

export const WorkpadTemplates = ({ plugins }) => {
  const findTemplates = useFindTemplates();
  const [isMounted, setIsMounted] = useState(false);
  const [templates, setTemplates] = useState<SecuritySolutionTemplate[]>([]);
  const [time, setTime] = useState({
    from: 'now-5d',
    to: 'now',
  });
  const [isLoading, setIsLoading] = useState(false);
  const activeScope = SourcererScopeName.default;
  const { dataViewId, indexPattern } = useSourcererDataView(activeScope);

  const {
    services: { lens },
  } = useKibana();

  const LensComponent = lens?.EmbeddableComponent;
  console.log('LensComponent', LensComponent);

  useEffect(() => {
    const mount = async () => {
      const response = await findTemplates();
      setIsMounted(true);
      setTemplates(response?.templates || []);
    };
    mount();
  }, [setIsMounted, findTemplates]);

  // const onCreateWorkpad = useCreateFromTemplate();

  if (!isMounted) {
    return <Loader />;
  }
  console.log('---WorkpadTemplates', templates ? templates[0]?.attributes : {});
  return (
    LensComponent && (
      <LensComponent
        id=""
        withActions
        style={{ height: 500 }}
        timeRange={time}
        attributes={temp()}
        onLoad={(val) => {
          setIsLoading(val);
        }}
        onBrushEnd={({ range }) => {
          setTime({
            from: new Date(range[0]).toISOString(),
            to: new Date(range[1]).toISOString(),
          });
        }}
        onFilter={(_data) => {
          // call back event for on filter event
        }}
        onTableRowClick={(_data) => {
          // call back event for on table row click event
        }}
        viewMode={'view'}
      />
    )
  );
  // return <Component {...{ templates, onCreateWorkpad }} />;
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default WorkpadTemplates;
