/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './index.scss';
import React, { useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiSwitch, EuiSwitchEvent, EuiButtonGroup, EuiSpacer } from '@elastic/eui';
import type { PaletteRegistry } from '@kbn/coloring';
import type { DatatableUtilitiesService } from '@kbn/data-plugin/common';
import {
  defaultAnnotationColor,
  defaultAnnotationRangeColor,
  isQueryAnnotationConfig,
  isRangeAnnotationConfig,
} from '@kbn/event-annotation-plugin/public';
import { QueryPointEventAnnotationConfig } from '@kbn/event-annotation-plugin/common';
import {
  FieldOption,
  FieldOptionValue,
  FieldPicker,
} from '../../../../shared_components/field_picker';
import { FormatFactory } from '../../../../../common';
import {
  DimensionEditorSection,
  fieldExists,
  NameInput,
  useDebouncedValue,
} from '../../../../shared_components';
import { isHorizontalChart } from '../../state_helpers';
import { defaultAnnotationLabel, defaultRangeAnnotationLabel } from '../../annotations/helpers';
import { ColorPicker } from '../color_picker';
import { IconSelectSetting, TextDecorationSetting } from '../shared/marker_decoration_settings';
import { LineStyleSettings } from '../shared/line_style_settings';
import { updateLayer } from '..';
import { annotationsIconSet } from './icon_set';
import type { VisualizationDimensionEditorProps } from '../../../../types';
import type { State, XYState, XYAnnotationLayerConfig } from '../../types';
import { ConfigPanelManualAnnotation } from './manual_annotation_panel';
import { ConfigPanelQueryAnnotation } from './query_annotation_panel';
import { TooltipSection } from './tooltip_annotation_panel';
import { sanitizeProperties, toLineAnnotationColor } from './helpers';

export const AnnotationsPanel = (
  props: VisualizationDimensionEditorProps<State> & {
    datatableUtilities: DatatableUtilitiesService;
    formatFactory: FormatFactory;
    paletteService: PaletteRegistry;
  }
) => {
  const { state, setState, layerId, accessor, frame } = props;
  const isHorizontal = isHorizontalChart(state.layers);

  const { inputValue: localState, handleInputChange: setLocalState } = useDebouncedValue<XYState>({
    value: state,
    onChange: setState,
  });

  const index = localState.layers.findIndex((l) => l.layerId === layerId);
  const localLayer = localState.layers.find(
    (l) => l.layerId === layerId
  ) as XYAnnotationLayerConfig;

  const currentAnnotation = localLayer.annotations?.find((c) => c.id === accessor);

  const isQueryBased = isQueryAnnotationConfig(currentAnnotation);
  const isRange = isRangeAnnotationConfig(currentAnnotation);
  const [queryInputShouldOpen, setQueryInputShouldOpen] = React.useState(false);
  useEffect(() => {
    if (isQueryBased) {
      setQueryInputShouldOpen(false);
    } else {
      setQueryInputShouldOpen(true);
    }
  }, [isQueryBased]);

  const setAnnotations = useCallback(
    (annotation) => {
      if (annotation == null) {
        return;
      }
      const newConfigs = [...(localLayer.annotations || [])];
      const existingIndex = newConfigs.findIndex((c) => c.id === accessor);
      if (existingIndex !== -1) {
        newConfigs[existingIndex] = sanitizeProperties({
          ...newConfigs[existingIndex],
          ...annotation,
        });
      } else {
        throw new Error(
          'should never happen because annotation is created before config panel is opened'
        );
      }
      setLocalState(updateLayer(localState, { ...localLayer, annotations: newConfigs }, index));
    },
    [accessor, index, localState, localLayer, setLocalState]
  );

  return (
    <>
      <DimensionEditorSection
        title={i18n.translate('xpack.lens.xyChart.placement', {
          defaultMessage: 'Placement',
        })}
      >
        <EuiFormRow
          label={i18n.translate('xpack.lens.xyChart.annotationDate.placementType', {
            defaultMessage: 'Placement Type',
          })}
          display="rowCompressed"
          fullWidth
        >
          <EuiButtonGroup
            legend={i18n.translate('xpack.lens.xyChart.annotationDate.placementType', {
              defaultMessage: 'Placement Type',
            })}
            data-test-subj="lns-xyAnnotation-placementType"
            name="placementType"
            buttonSize="compressed"
            options={[
              {
                id: `lens_xyChart_annotation_manual`,
                label: i18n.translate('xpack.lens.xyChart.annotation.manual', {
                  defaultMessage: 'Static Date',
                }),
                'data-test-subj': 'lnsXY_annotation_manual',
              },
              {
                id: `lens_xyChart_annotation_query`,
                label: i18n.translate('xpack.lens.xyChart.annotation.query', {
                  defaultMessage: 'Query',
                }),
                'data-test-subj': 'lnsXY_annotation_query',
              },
            ]}
            idSelected={`lens_xyChart_annotation_${currentAnnotation?.type}`}
            onChange={(id) => {
              const typeFromId = id.replace('lens_xyChart_annotation_', '');
              if (currentAnnotation?.type === typeFromId) {
                return;
              }
              if (currentAnnotation?.key.type === 'range') {
                setAnnotations({
                  type: typeFromId,
                  label:
                    currentAnnotation.label === defaultRangeAnnotationLabel
                      ? defaultAnnotationLabel
                      : currentAnnotation.label,
                  color: toLineAnnotationColor(currentAnnotation.color),
                  key: { type: 'point_in_time' },
                });
              } else {
                setAnnotations({
                  type: typeFromId,
                  key: currentAnnotation?.key,
                });
              }
            }}
            isFullWidth
          />
        </EuiFormRow>
        {isQueryBased ? (
          <ConfigPanelQueryAnnotation
            annotation={currentAnnotation}
            onChange={setAnnotations}
            frame={frame}
            state={state}
            layer={localLayer}
            queryInputShouldOpen={queryInputShouldOpen}
          />
        ) : (
          <ConfigPanelManualAnnotation
            annotation={currentAnnotation}
            onChange={setAnnotations}
            datatableUtilities={props.datatableUtilities}
            frame={frame}
            state={state}
          />
        )}
      </DimensionEditorSection>
      <DimensionEditorSection
        title={i18n.translate('xpack.lens.xyChart.appearance', {
          defaultMessage: 'Appearance',
        })}
      >
        <NameInput
          value={currentAnnotation?.label || defaultAnnotationLabel}
          defaultValue={defaultAnnotationLabel}
          onChange={(value) => {
            setAnnotations({ label: value });
          }}
        />
        {!isRange && (
          <>
            <IconSelectSetting
              setConfig={setAnnotations}
              defaultIcon="triangle"
              currentConfig={{
                axisMode: 'bottom',
                ...currentAnnotation,
              }}
              customIconSet={annotationsIconSet}
            />
            <TextDecorationSetting
              setConfig={setAnnotations}
              currentConfig={{
                axisMode: 'bottom',
                ...currentAnnotation,
              }}
              isQueryBased={isQueryBased}
            >
              {(textDecorationSelected) => {
                if (textDecorationSelected !== 'field') {
                  return null;
                }
                const currentIndexPattern =
                  frame.dataViews.indexPatterns[localLayer.indexPatternId];
                const options = currentIndexPattern.fields
                  .filter(({ displayName, type }) => displayName && type !== 'document')
                  .map(
                    (field) =>
                      ({
                        label: field.displayName,
                        value: {
                          type: 'field',
                          field: field.name,
                          dataType: field.type,
                        },
                        exists: fieldExists(
                          frame.dataViews.existingFields[currentIndexPattern.title],
                          field.name
                        ),
                        compatible: true,
                        'data-test-subj': `lnsXY-annotation-fieldOption-${field.name}`,
                      } as FieldOption<FieldOptionValue>)
                  );
                const selectedField = (currentAnnotation as QueryPointEventAnnotationConfig)
                  .textField;

                const fieldIsValid = selectedField
                  ? Boolean(currentIndexPattern.getFieldByName(selectedField))
                  : true;
                return (
                  <>
                    <EuiSpacer size="xs" />
                    <FieldPicker
                      selectedOptions={
                        selectedField
                          ? [
                              {
                                label: selectedField,
                                value: { type: 'field', field: selectedField },
                              },
                            ]
                          : []
                      }
                      options={options}
                      onChoose={function (choice: FieldOptionValue | undefined): void {
                        if (choice) {
                          setAnnotations({ textField: choice.field });
                        }
                      }}
                      fieldIsInvalid={!fieldIsValid}
                      autoFocus={!selectedField}
                    />
                  </>
                );
              }}
            </TextDecorationSetting>
            <LineStyleSettings
              isHorizontal={isHorizontal}
              setConfig={setAnnotations}
              currentConfig={currentAnnotation}
            />
          </>
        )}
        {isRange && (
          <EuiFormRow
            label={i18n.translate('xpack.lens.xyChart.fillStyle', {
              defaultMessage: 'Fill',
            })}
            display="columnCompressed"
            fullWidth
          >
            <EuiButtonGroup
              legend={i18n.translate('xpack.lens.xyChart.fillStyle', {
                defaultMessage: 'Fill',
              })}
              data-test-subj="lns-xyAnnotation-fillStyle"
              name="fillStyle"
              buttonSize="compressed"
              options={[
                {
                  id: `lens_xyChart_fillStyle_inside`,
                  label: i18n.translate('xpack.lens.xyChart.fillStyle.inside', {
                    defaultMessage: 'Inside',
                  }),
                  'data-test-subj': 'lnsXY_fillStyle_inside',
                },
                {
                  id: `lens_xyChart_fillStyle_outside`,
                  label: i18n.translate('xpack.lens.xyChart.fillStyle.outside', {
                    defaultMessage: 'Outside',
                  }),
                  'data-test-subj': 'lnsXY_fillStyle_inside',
                },
              ]}
              idSelected={`lens_xyChart_fillStyle_${
                Boolean(currentAnnotation?.outside) ? 'outside' : 'inside'
              }`}
              onChange={(id) => {
                setAnnotations({
                  outside: id === `lens_xyChart_fillStyle_outside`,
                });
              }}
              isFullWidth
            />
          </EuiFormRow>
        )}

        <ColorPicker
          {...props}
          overwriteColor={currentAnnotation?.color}
          defaultColor={isRange ? defaultAnnotationRangeColor : defaultAnnotationColor}
          showAlpha={isRange}
          setConfig={setAnnotations}
          disableHelpTooltip
          label={i18n.translate('xpack.lens.xyChart.lineColor.label', {
            defaultMessage: 'Color',
          })}
        />
        <ConfigPanelHideSwitch
          value={Boolean(currentAnnotation?.isHidden)}
          onChange={(ev) => setAnnotations({ isHidden: ev.target.checked })}
        />
      </DimensionEditorSection>
      {isQueryBased && currentAnnotation && (
        <DimensionEditorSection
          title={i18n.translate('xpack.lens.xyChart.tooltip', {
            defaultMessage: 'Tooltip',
          })}
        >
          <EuiFormRow
            display="rowCompressed"
            className="lnsRowCompressedMargin"
            fullWidth
            label={i18n.translate('xpack.lens.xyChart.annotation.tooltip', {
              defaultMessage: 'Show additional fields',
            })}
          >
            <TooltipSection
              currentConfig={currentAnnotation}
              setConfig={setAnnotations}
              indexPattern={frame.dataViews.indexPatterns[localLayer.indexPatternId]}
              existingFields={frame.dataViews.existingFields}
            />
          </EuiFormRow>
        </DimensionEditorSection>
      )}
    </>
  );
};

const ConfigPanelHideSwitch = ({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (event: EuiSwitchEvent) => void;
}) => {
  return (
    <EuiFormRow
      label={i18n.translate('xpack.lens.xyChart.annotation.name', {
        defaultMessage: 'Hide annotation',
      })}
      display="columnCompressedSwitch"
      fullWidth
    >
      <EuiSwitch
        compressed
        label={i18n.translate('xpack.lens.xyChart.annotation.name', {
          defaultMessage: 'Hide annotation',
        })}
        showLabel={false}
        data-test-subj="lns-annotations-hide-annotation"
        checked={value}
        onChange={onChange}
      />
    </EuiFormRow>
  );
};
