/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import { i18n } from '@kbn/i18n';
import type { LensEmbeddableInput, LensPublicStart } from '@kbn/lens-plugin/public';
import React, { useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import {
  LensAttributes,
  LensConfigBuilder,
  LensSeriesLayer,
  LensXYConfig,
} from '@kbn/lens-embeddable-utils/config_builder';
import { Assign } from 'utility-types';
import type { LensFunctionArguments } from '../../common/functions/lens';
import type {
  ObservabilityAIAssistantPluginStartDependencies,
  ObservabilityAIAssistantService,
  RegisterRenderFunctionDefinition,
  RenderFunction,
} from '../types';

export enum SeriesType {
  Bar = 'bar',
  Line = 'line',
  Area = 'area',
  BarStacked = 'bar_stacked',
  AreaStacked = 'area_stacked',
  BarHorizontal = 'bar_horizontal',
  BarPercentageStacked = 'bar_percentage_stacked',
  AreaPercentageStacked = 'area_percentage_stacked',
  BarHorizontalPercentageStacked = 'bar_horizontal_percentage_stacked',
}

function Lens({
  indexPattern,
  config,
  start,
  end,
  lens,
  dataViews,
  timeField,
}: {
  indexPattern: string;
  config: {
    layers: LensFunctionArguments['layers'];
    seriesType: LensFunctionArguments['seriesType'];
    breakdown: LensFunctionArguments['breakdown'];
  };
  start: string;
  end: string;
  lens: LensPublicStart;
  dataViews: DataViewsServicePublic;
  timeField: string;
}) {
  const formulaAsync = useAsync(() => {
    return lens.stateHelperApi();
  }, [lens]);

  const configAsync = useAsync(async () => {
    if (!formulaAsync.value) return;

    const lensConfig: LensXYConfig = {
      title: 'lens chart',
      chartType: 'xy',
      dataset: {
        index: indexPattern,
        timeFieldName: timeField,
      },
      layers: config.layers.map((layer) => ({
        seriesType: (config.seriesType as LensSeriesLayer['seriesType']) || 'line',
        type: 'series',
        label: layer.label,
        format: layer.format,
        xAxis: '@timestamp',
        yAxis: [{ value: layer.formula }],
        ...(config.breakdown
          ? { breakdown: { type: 'topValues', size: 10, field: config.breakdown.field } }
          : {}),
      })),
    };

    const configBuilder = new LensConfigBuilder(formulaAsync.value.formula, dataViews);
    const lensAttributes = await configBuilder.build(lensConfig, {
      embeddable: true,
      timeRange: {
        from: start,
        to: end,
        type: 'relative' as const,
      },
    });

    return lensAttributes;
  }, [indexPattern]);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  if (!formulaAsync.value || !configAsync.value) {
    return <EuiLoadingSpinner />;
  }

  const lensEmbeddableInput = configAsync.value as Assign<
    LensEmbeddableInput,
    { attributes: LensAttributes }
  >;

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" gutterSize="s" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="observabilityAiAssistantLensOpenInLensButton"
                iconType="lensApp"
                onClick={() => {
                  lens.navigateToPrefilledEditor(lensEmbeddableInput);
                }}
              >
                {i18n.translate('xpack.observabilityAiAssistant.lensFunction.openInLens', {
                  defaultMessage: 'Open in Lens',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="observabilityAiAssistantLensSaveButton"
                iconType="save"
                onClick={() => {
                  setIsSaveModalOpen(() => true);
                }}
              >
                {i18n.translate('xpack.observabilityAiAssistant.lensFunction.save', {
                  defaultMessage: 'Save',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <lens.EmbeddableComponent
            {...lensEmbeddableInput}
            style={{
              height: 240,
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {isSaveModalOpen ? (
        <lens.SaveModalComponent
          initialInput={lensEmbeddableInput}
          onClose={() => {
            setIsSaveModalOpen(() => false);
          }}
        />
      ) : null}
    </>
  );
}

export function registerLensRenderFunction({
  service,
  registerRenderFunction,
  pluginsStart,
}: {
  service: ObservabilityAIAssistantService;
  registerRenderFunction: RegisterRenderFunctionDefinition;
  pluginsStart: ObservabilityAIAssistantPluginStartDependencies;
}) {
  registerRenderFunction(
    'lens',
    ({
      arguments: { layers, indexPattern, breakdown, seriesType, start, end, timeField },
    }: Parameters<RenderFunction<LensFunctionArguments, {}>>[0]) => {
      if (!timeField) return;

      return (
        <Lens
          indexPattern={indexPattern}
          config={{ layers, breakdown, seriesType }}
          start={start}
          end={end}
          lens={pluginsStart.lens}
          dataViews={pluginsStart.dataViews}
          timeField={timeField}
        />
      );
    }
  );
}
