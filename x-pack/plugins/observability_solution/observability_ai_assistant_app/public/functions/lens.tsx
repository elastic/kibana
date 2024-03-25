/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import { i18n } from '@kbn/i18n';
import { LensAttributesBuilder, XYChart, XYDataLayer } from '@kbn/lens-embeddable-utils';
import type { LensEmbeddableInput, LensPublicStart } from '@kbn/lens-plugin/public';
import React, { useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { Assign } from 'utility-types';
import {
  RegisterRenderFunctionDefinition,
  RenderFunction,
} from '@kbn/observability-ai-assistant-plugin/public/types';
import type { LensFunctionArguments } from '../../common/functions/lens';
import { ObservabilityAIAssistantAppPluginStartDependencies } from '../types';

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
  xyDataLayer,
  start,
  end,
  lens,
  dataViews,
  timeField,
}: {
  indexPattern: string;
  xyDataLayer: XYDataLayer;
  start: string;
  end: string;
  lens: LensPublicStart;
  dataViews: DataViewsServicePublic;
  timeField: string;
}) {
  const formulaAsync = useAsync(() => {
    return lens.stateHelperApi();
  }, [lens]);

  const dataViewAsync = useAsync(() => {
    return dataViews.create({
      title: indexPattern,
      timeFieldName: timeField,
    });
  }, [indexPattern]);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  if (!formulaAsync.value || !dataViewAsync.value) {
    return <EuiLoadingSpinner />;
  }

  const attributes = new LensAttributesBuilder({
    visualization: new XYChart({
      layers: [xyDataLayer],
      formulaAPI: formulaAsync.value.formula,
      dataView: dataViewAsync.value,
    }),
  }).build();

  const lensEmbeddableInput: Assign<LensEmbeddableInput, { attributes: typeof attributes }> = {
    id: indexPattern,
    attributes,
    timeRange: {
      from: start,
      to: end,
      mode: 'relative' as const,
    },
  };

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
  registerRenderFunction,
  pluginsStart,
}: {
  registerRenderFunction: RegisterRenderFunctionDefinition;
  pluginsStart: ObservabilityAIAssistantAppPluginStartDependencies;
}) {
  registerRenderFunction(
    'lens',
    ({
      arguments: { layers, indexPattern, breakdown, seriesType, start, end, timeField },
    }: Parameters<RenderFunction<LensFunctionArguments, {}>>[0]) => {
      const xyDataLayer = new XYDataLayer({
        data: layers.map((layer) => ({
          type: 'formula',
          value: layer.formula,
          label: layer.label,
          format: layer.format,
          filter: {
            language: 'kql',
            query: layer.filter ?? '',
          },
        })),
        options: {
          seriesType,
          breakdown: breakdown
            ? { type: 'top_values', params: { size: 10 }, field: breakdown.field }
            : undefined,
        },
      });

      if (!timeField) return;

      return (
        <Lens
          indexPattern={indexPattern}
          xyDataLayer={xyDataLayer}
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
