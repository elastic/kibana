/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiToolTip,
  EuiButtonIcon,
} from '@elastic/eui';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import { type LensChartLoadEvent } from '@kbn/visualization-utils';
import { i18n } from '@kbn/i18n';
import { LensAttributesBuilder, XYChart, XYDataLayer } from '@kbn/lens-embeddable-utils';
import type {
  LensEmbeddableInput,
  LensPublicStart,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';
import React, { useState, useCallback, useEffect } from 'react';
import useAsync from 'react-use/lib/useAsync';
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
  xyDataLayer,
  start,
  end,
  lens,
  uiActions,
  dataViews,
  timeField,
}: {
  indexPattern: string;
  xyDataLayer: XYDataLayer;
  start: string;
  end: string;
  lens: LensPublicStart;
  uiActions: UiActionsStart;
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
  const [lensInput, setLensInput] = useState<TypedLensByValueInput | undefined>(undefined);
  const [lensLoadEvent, setLensLoadEvent] = useState<LensChartLoadEvent | null>(null);

  const onLoad = useCallback(
    (
      isLoading: boolean,
      adapters: LensChartLoadEvent['adapters'] | undefined,
      lensEmbeddableOutput$?: LensChartLoadEvent['embeddableOutput$'],
      lensEmbeddable?: LensChartLoadEvent['embeddable']
    ) => {
      const adapterTables = adapters?.tables?.tables;
      if (adapterTables && !isLoading) {
        setLensLoadEvent({
          adapters,
          embeddableOutput$: lensEmbeddableOutput$,
          embeddable: lensEmbeddable,
        });
      }
    },
    []
  );

  // initialization
  useEffect(() => {
    if (formulaAsync.value && dataViewAsync.value && !lensInput) {
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
      setLensInput(lensEmbeddableInput);
    }
  }, [dataViewAsync.value, end, formulaAsync.value, indexPattern, lensInput, start, xyDataLayer]);

  if (!formulaAsync.value || !dataViewAsync.value) {
    return <EuiLoadingSpinner />;
  }

  const triggerOptions = {
    ...lensInput,
    lensEvent: lensLoadEvent,
    onUpdate: (newAttributes: TypedLensByValueInput['attributes']) => {
      if (lensInput) {
        const newInput = {
          ...lensInput,
          attributes: newAttributes,
        };
        setLensInput(newInput);
      }
    },
    onApply: (newAttributes: TypedLensByValueInput['attributes']) => {
      // const newInput = {
      //   ...lensInput,
      //   attributes: newAttributes,
      // };
      // ToDo: Run onApply to save the configuration on the convo
      // onActionClick({ type: ChatActionClickType.updateVisualization, newInput, query });
    },
  };

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" gutterSize="s" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate('xpack.observabilityAiAssistant.lensESQLFunction.edit', {
                  defaultMessage: 'Edit visualization',
                })}
              >
                <EuiButtonIcon
                  size="xs"
                  data-test-subj="observabilityAiAssistantLensOpenInLensButton"
                  iconType="pencil"
                  onClick={() => uiActions.getTrigger('IN_APP_EDIT_TRIGGER').exec(triggerOptions)}
                  aria-label={i18n.translate(
                    'xpack.observabilityAiAssistant.lensESQLFunction.edit',
                    {
                      defaultMessage: 'Edit visualization',
                    }
                  )}
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate('xpack.observabilityAiAssistant.lensESQLFunction.save', {
                  defaultMessage: 'Save visualization',
                })}
              >
                <EuiButtonIcon
                  size="xs"
                  iconType="save"
                  onClick={() => setIsSaveModalOpen(true)}
                  data-test-subj="observabilityAiAssistantLensESQLSaveButton"
                  aria-label={i18n.translate(
                    'xpack.observabilityAiAssistant.lensESQLFunction.save',
                    {
                      defaultMessage: 'Save visualization',
                    }
                  )}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          {lensInput && (
            <lens.EmbeddableComponent
              {...lensInput}
              style={{
                height: 240,
              }}
              onLoad={onLoad}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
      {isSaveModalOpen ? (
        <lens.SaveModalComponent
          initialInput={lensInput}
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
          uiActions={pluginsStart.uiActions}
          dataViews={pluginsStart.dataViews}
          timeField={timeField}
        />
      );
    }
  );
}
