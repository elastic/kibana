/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiEmptyPrompt } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { type GlobalWidgetParameters } from '@kbn/investigate-plugin/public';
import React, { useEffect, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';

import {
  LensAttributes,
  XYLayerOptions,
  XYDataLayer,
  XYReferenceLinesLayer,
  XYByValueAnnotationsLayer,
  LensAttributesBuilder,
  XYChart,
} from '@kbn/lens-embeddable-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { Query, Filter } from '@kbn/es-query';
import type { Options } from '../register_items';
import { useKibana } from '../../hooks/use_kibana';

interface GenericSearchSourceFields extends SerializedSearchSourceFields {
  query?: Query;
  filter?: Array<Pick<Filter, 'meta' | 'query'>>;
}

interface Props {
  timeRange: {
    from: string;
    to: string;
  };
  searchConfiguration: GenericSearchSourceFields;
  equation: string;
  interval?: string;
  filters?: Filter[];
  groupBy?: string[] | string;
}

export interface RuleSearchSourceFields extends SerializedSearchSourceFields {
  query?: Query;
  filter?: Array<Pick<Filter, 'meta' | 'query'>>;
}

interface LensItemParams {
  type: string;
  searchConfiguration: RuleSearchSourceFields;
  equation: string;
  interval?: string;
  filters?: Filter[];
  groupBy?: string[] | string;
}

const defaultQuery: Query = {
  language: 'kuery',
  query: '',
};

export const LensFieldFormat = {
  NUMBER: 'number',
  PERCENT: 'percent',
  BITS: 'bits',
} as const;

export function LensWidget({
  timeRange,
  searchConfiguration,
  equation,
  interval,
  filters,
  groupBy,
}: Props) {
  const {
    dependencies: {
      start: { lens, data },
    },
  } = useKibana();

  const [attributes, setAttributes] = useState<LensAttributes>();
  const [chartLoading, setChartLoading] = useState<boolean>(false);

  const formulaAsync = useAsync(() => {
    return lens.stateHelperApi();
  }, [lens]);

  const [dataView, setDataView] = useState<DataView>();
  const [, setDataViewError] = useState<Error>();

  useEffect(() => {
    const initDataView = async () => {
      const ruleSearchConfiguration = searchConfiguration;
      try {
        const createdSearchSource = await data.search.searchSource.create(ruleSearchConfiguration);
        setDataView(createdSearchSource.getField('index'));
      } catch (error) {
        setDataViewError(error);
      }
    };

    initDataView();
  }, [data.search.searchSource, searchConfiguration]);

  // Handle Lens error
  useEffect(() => {
    // Lens does not expose or provide a way to check if there is an error in the chart, yet.
    // To work around this, we check if the element with class 'lnsEmbeddedError' is found in the DOM.
    setTimeout(function () {
      const errorDiv = document.querySelector('.lnsEmbeddedError');
      if (errorDiv) {
        const paragraphElements = errorDiv.querySelectorAll('p');
        if (!paragraphElements || paragraphElements.length < 2) return;
        paragraphElements[0].innerText = i18n.translate(
          'xpack.investigateApp.defaultChart.error_equation.title',
          {
            defaultMessage: 'An error occurred while rendering the chart',
          }
        );
        paragraphElements[1].innerText = i18n.translate(
          'xpack.investigateApp.defaultChart.error_equation.description',
          {
            defaultMessage: 'Check the equation.',
          }
        );
      }
    });
  }, [chartLoading, attributes]);

  useEffect(() => {
    if (!formulaAsync.value || !dataView || !equation) {
      return;
    }
    const baseLayer = {
      type: 'formula',
      value: equation,
      label: equation,
      groupBy,
    };
    const xYDataLayerOptions: XYLayerOptions = {
      buckets: {
        type: 'date_histogram',
        params: {
          interval,
        },
      },
      seriesType: 'bar_stacked',
    };

    if (groupBy && groupBy?.length) {
      xYDataLayerOptions.breakdown = {
        type: 'top_values',
        field: groupBy[0],
        params: {
          size: 3,
          secondaryFields: (groupBy as string[]).slice(1),
          accuracyMode: false,
        },
      };
    }

    const xyDataLayer = new XYDataLayer({
      data: [baseLayer].map((layer) => ({
        type: layer.type,
        value: layer.value,
        label: layer.label,
      })),
      options: xYDataLayerOptions,
    });

    const layers: Array<XYDataLayer | XYReferenceLinesLayer | XYByValueAnnotationsLayer> = [
      xyDataLayer,
    ];

    const attributesLens = new LensAttributesBuilder({
      visualization: new XYChart({
        visualOptions: {
          axisTitlesVisibilitySettings: {
            x: false,
            yLeft: false,
            yRight: false,
          },
          legend: {
            isVisible: false,
            position: 'right',
          },
        },
        layers,
        formulaAPI: formulaAsync.value.formula,
        dataView,
      }),
    }).build();
    const lensBuilderAtt = { ...attributesLens, type: 'lens' };
    setAttributes(lensBuilderAtt);
  }, [searchConfiguration, equation, groupBy, interval, dataView, formulaAsync.value]);

  if (!dataView || !attributes || !timeRange) {
    return (
      <div style={{ maxHeight: 180, minHeight: 180 }}>
        <EuiEmptyPrompt
          iconType="visArea"
          titleSize="xxs"
          data-test-subj="investigateAppNoChartData"
          body={
            <FormattedMessage
              id="xpack.investigateApp.defaultChart.noData.title"
              defaultMessage="No chart data available"
            />
          }
        />
      </div>
    );
  }

  return (
    <div>
      <lens.EmbeddableComponent
        onLoad={setChartLoading}
        id="alertDefaultChart"
        style={{ height: 128 }}
        timeRange={timeRange}
        attributes={attributes}
        query={(searchConfiguration?.query as Query) || defaultQuery}
        disableTriggers={true}
        filters={filters}
        overrides={{ axisX: { hide: true } }}
      />
    </div>
  );
}

export function registerLensItem({
  dependencies: {
    setup: { investigate },
  },
}: Options) {
  investigate.registerItemDefinition<LensItemParams>({
    type: 'lens',
    generate: async () => {
      return {};
    },
    render: (option: { itemParams: LensItemParams; globalParams: GlobalWidgetParameters }) => {
      const { itemParams, globalParams } = option;
      return (
        <LensWidget
          equation={itemParams.equation}
          searchConfiguration={itemParams.searchConfiguration}
          interval={itemParams.interval}
          filters={itemParams.filters}
          groupBy={itemParams.groupBy}
          timeRange={globalParams.timeRange}
        />
      );
    },
  });
}
