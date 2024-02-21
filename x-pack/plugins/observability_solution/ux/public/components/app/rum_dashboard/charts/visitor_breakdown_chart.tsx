/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import {
  CountIndexPatternColumn,
  PersistedIndexPatternLayer,
  PieVisualizationState,
  TermsIndexPatternColumn,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';
import { EuiText } from '@elastic/eui';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { DataView } from '@kbn/data-views-plugin/public';
import { v4 as uuidv4 } from 'uuid';
import { TRANSACTION_PAGE_LOAD } from '../../../../../common/transaction_types';
import {
  PROCESSOR_EVENT,
  TRANSACTION_TYPE,
} from '../../../../../common/elasticsearch_fieldnames';
import { getEsFilter } from '../../../../services/data/get_es_filter';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import type { UxUIFilters } from '../../../../../typings/ui_filters';

const BUCKET_SIZE = 9;

export enum VisitorBreakdownMetric {
  OS_BREAKDOWN = 'user_agent.os.name',
  UA_BREAKDOWN = 'user_agent.name',
}

interface LensAttributes {
  metric: VisitorBreakdownMetric;
  uiFilters: UxUIFilters;
  urlQuery?: string;
  dataView: DataView;
}

type Props = {
  start: string;
  end: string;
  onFilter: (metric: VisitorBreakdownMetric, event: any) => void;
} & LensAttributes;

export function VisitorBreakdownChart({
  start,
  end,
  onFilter,
  uiFilters,
  urlQuery,
  metric,
  dataView,
}: Props) {
  const kibana = useKibanaServices();
  const LensEmbeddableComponent = kibana.lens.EmbeddableComponent;
  const [localDataViewId] = useState<string>(uuidv4());

  const lensAttributes = useMemo(
    () =>
      getVisitorBreakdownLensAttributes({
        uiFilters,
        urlQuery,
        metric,
        dataView,
        localDataViewId,
      }),
    [uiFilters, urlQuery, metric, dataView, localDataViewId]
  );

  const filterHandler = useCallback(
    (event) => {
      onFilter(metric, event);
    },
    [onFilter, metric]
  );

  if (!LensEmbeddableComponent) {
    return <EuiText>No lens component</EuiText>;
  }

  return (
    <LensEmbeddableComponent
      id={`ux-visitor-breakdown-${metric.replaceAll('.', '-')}`}
      hidePanelTitles
      withDefaultActions
      style={{ minHeight: '250px', height: '100%' }}
      attributes={lensAttributes}
      timeRange={{
        from: start ?? '',
        to: end ?? '',
      }}
      viewMode={ViewMode.VIEW}
      onFilter={filterHandler}
    />
  );
}

const visConfig: PieVisualizationState = {
  layers: [
    {
      layerId: 'layer1',
      primaryGroups: ['col1'],
      metrics: ['col2'],
      categoryDisplay: 'default',
      legendDisplay: 'hide',
      numberDisplay: 'percent',
      showValuesInLegend: true,
      nestedLegend: false,
      layerType: 'data',
    },
  ],
  shape: 'pie',
};

export function getVisitorBreakdownLensAttributes({
  uiFilters,
  urlQuery,
  metric,
  dataView,
  localDataViewId,
}: LensAttributes & {
  localDataViewId: string;
}): TypedLensByValueInput['attributes'] {
  const localDataView = dataView.toSpec(false);
  localDataView.id = localDataViewId;

  const dataLayer: PersistedIndexPatternLayer = {
    incompleteColumns: {},
    columnOrder: ['col1', 'col2'],
    columns: {
      col1: {
        label: `Top ${BUCKET_SIZE} values of ${metric}`,
        dataType: 'string',
        operationType: 'terms',
        scale: 'ordinal',
        sourceField: metric,
        isBucketed: true,
        params: {
          size: BUCKET_SIZE,
          orderBy: {
            type: 'column',
            columnId: 'col2',
          },
          orderDirection: 'desc',
          otherBucket: true,
          parentFormat: {
            id: 'terms',
          },
        },
      } as TermsIndexPatternColumn,
      col2: {
        label: 'Count of records',
        dataType: 'number',
        operationType: 'count',
        isBucketed: false,
        scale: 'ratio',
        sourceField: '___records___',
        params: {
          emptyAsNull: true,
        },
      } as CountIndexPatternColumn,
    },
  };

  return {
    visualizationType: 'lnsPie',
    title: `ux-visitor-breakdown-${metric}`,
    references: [],
    state: {
      internalReferences: [
        {
          id: localDataView.id,
          name: 'indexpattern-datasource-current-indexpattern',
          type: 'index-pattern',
        },
        {
          id: localDataView.id,
          name: 'indexpattern-datasource-layer-layer1',
          type: 'index-pattern',
        },
      ],
      adHocDataViews: {
        [localDataView.id]: localDataView,
      },
      datasourceStates: {
        formBased: {
          layers: {
            layer1: dataLayer,
          },
        },
      },
      filters: [
        {
          meta: {},
          query: {
            bool: {
              filter: [
                { term: { [TRANSACTION_TYPE]: TRANSACTION_PAGE_LOAD } },
                {
                  terms: {
                    [PROCESSOR_EVENT]: [ProcessorEvent.transaction],
                  },
                },
                {
                  exists: {
                    field: 'transaction.marks.navigationTiming.fetchStart',
                  },
                },
                ...getEsFilter(uiFilters),
                ...(urlQuery
                  ? [
                      {
                        wildcard: {
                          'url.full': `*${urlQuery}*`,
                        },
                      },
                    ]
                  : []),
              ],
              must_not: [...getEsFilter(uiFilters, true)],
            },
          },
        },
      ],
      query: { language: 'kuery', query: '' },
      visualization: visConfig,
    },
  };
}
