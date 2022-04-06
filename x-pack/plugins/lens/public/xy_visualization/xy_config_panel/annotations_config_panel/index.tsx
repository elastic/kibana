/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './index.scss';
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { PaletteRegistry } from '@kbn/coloring';
import {
  EuiDatePicker,
  EuiFormRow,
  EuiSwitch,
  EuiSwitchEvent,
  EuiButtonGroup,
  EuiFormLabel,
  EuiFormControlLayout,
} from '@elastic/eui';
import moment from 'moment';
import {
  EventAnnotationConfig,
  PointInTimeEventAnnotationConfig,
  RangeEventAnnotationConfig,
} from 'src/plugins/event_annotation/common/types';
import { search } from '../../../../../../../src/plugins/data/public';
import type { FramePublicAPI, VisualizationDimensionEditorProps } from '../../../types';
import { State, XYState, XYAnnotationLayerConfig, XYDataLayerConfig } from '../../types';
import { FormatFactory } from '../../../../common';
import { DimensionEditorSection, NameInput, useDebouncedValue } from '../../../shared_components';
import { isHorizontalChart } from '../../state_helpers';
import { defaultAnnotationLabel, defaultRangeAnnotationLabel } from '../../annotations/helpers';
import { ColorPicker } from '../color_picker';
import { IconSelectSetting, TextDecorationSetting } from '../shared/marker_decoration_settings';
import { LineStyleSettings } from '../shared/line_style_settings';
import { updateLayer } from '..';
import { annotationsIconSet } from './icon_set';
import { getDataLayers } from '../../visualization_helpers';

export const getEndTimestamp = (
  startTime: string,
  activeData: FramePublicAPI['activeData'],
  dataLayers: XYDataLayerConfig[]
) => {
  const startTimeNumber = moment(startTime).valueOf();
  const fallbackValue = moment(startTimeNumber + 8.64e7).toISOString();

  const dataLayersId = dataLayers.map(({ layerId }) => layerId);
  if (
    !dataLayersId.length ||
    !activeData ||
    Object.entries(activeData)
      .filter(([key]) => dataLayersId.includes(key))
      .every(([, { rows }]) => !rows || !rows.length)
  ) {
    return fallbackValue;
  }
  const xColumn = activeData?.[dataLayersId[0]].columns.find(
    (column) => column.id === dataLayers[0].xAccessor
  );
  if (!xColumn) {
    return fallbackValue;
  }

  const dateInterval = search.aggs.getDateHistogramMetaDataByDatatableColumn(xColumn)?.interval;
  if (!dateInterval) return fallbackValue;
  const intervalDuration = search.aggs.parseInterval(dateInterval);
  if (!intervalDuration) return fallbackValue;
  return moment(startTimeNumber + 3 * intervalDuration.as('milliseconds')).toISOString();
};

export const AnnotationsPanel = (
  props: VisualizationDimensionEditorProps<State> & {
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

  const isRange = isRangeAnnotation(currentAnnotation);

  const setAnnotations = useCallback(
    (annotations) => {
      if (annotations == null) {
        return;
      }
      const newConfigs = [...(localLayer.annotations || [])];
      const existingIndex = newConfigs.findIndex((c) => c.id === accessor);
      if (existingIndex !== -1) {
        newConfigs[existingIndex] = { ...newConfigs[existingIndex], ...annotations };
      } else {
        return; // that should never happen because annotations are created before annotations panel is opened
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
        {isRange ? (
          <>
            <ConfigPanelRangeDatePicker
              prependLabel={i18n.translate('xpack.lens.xyChart.annotationDate.from', {
                defaultMessage: 'From',
              })}
              value={moment(currentAnnotation?.key.timestamp)}
              onChange={(date) => {
                if (date) {
                  const currentEndTime = moment(currentAnnotation?.key.endTimestamp).valueOf();
                  if (currentEndTime < date.valueOf()) {
                    const currentStartTime = moment(currentAnnotation?.key.timestamp).valueOf();
                    const dif = currentEndTime - currentStartTime;
                    setAnnotations({
                      key: {
                        ...(currentAnnotation?.key || { type: 'range' }),
                        timestamp: date.toISOString(),
                        endTimestamp: moment(date.valueOf() + dif).toISOString(),
                      },
                    });
                  } else {
                    setAnnotations({
                      key: {
                        ...(currentAnnotation?.key || { type: 'range' }),
                        timestamp: date.toISOString(),
                      },
                    });
                  }
                }
              }}
              label={i18n.translate('xpack.lens.xyChart.annotationDate', {
                defaultMessage: 'Annotation date',
              })}
            />
            <ConfigPanelRangeDatePicker
              prependLabel={i18n.translate('xpack.lens.xyChart.annotationDate.to', {
                defaultMessage: 'To',
              })}
              value={moment(currentAnnotation?.key.endTimestamp)}
              onChange={(date) => {
                if (date) {
                  const currentStartTime = moment(currentAnnotation?.key.timestamp).valueOf();
                  if (currentStartTime > date.valueOf()) {
                    const currentEndTime = moment(currentAnnotation?.key.endTimestamp).valueOf();
                    const dif = currentEndTime - currentStartTime;
                    setAnnotations({
                      key: {
                        ...(currentAnnotation?.key || { type: 'range' }),
                        endTimestamp: date.toISOString(),
                        timestamp: moment(date.valueOf() - dif).toISOString(),
                      },
                    });
                  } else {
                    setAnnotations({
                      key: {
                        ...(currentAnnotation?.key || { type: 'range' }),
                        endTimestamp: date.toISOString(),
                      },
                    });
                  }
                }
              }}
            />
          </>
        ) : (
          <ConfigPanelRangeDatePicker
            label={i18n.translate('xpack.lens.xyChart.annotationDate', {
              defaultMessage: 'Annotation date',
            })}
            value={moment(currentAnnotation?.key.timestamp)}
            onChange={(date) => {
              if (date) {
                setAnnotations({
                  key: {
                    ...(currentAnnotation?.key || { type: 'point_in_time' }),
                    timestamp: date.toISOString(),
                  },
                });
              }
            }}
          />
        )}

        <ConfigPanelApplyAsRangeSwitch
          annotation={currentAnnotation}
          onChange={setAnnotations}
          activeData={frame.activeData}
          state={state}
        />
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
          <IconSelectSetting
            setConfig={setAnnotations}
            currentConfig={{
              axisMode: 'bottom',
              ...currentAnnotation,
            }}
            customIconSet={annotationsIconSet}
          />
        )}
        {!isRange && (
          <TextDecorationSetting
            setConfig={setAnnotations}
            currentConfig={{
              axisMode: 'bottom',
              ...currentAnnotation,
            }}
          />
        )}
        {!isRange && (
          <LineStyleSettings
            isHorizontal={isHorizontal}
            setConfig={setAnnotations}
            currentConfig={currentAnnotation}
          />
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
              data-test-subj="lns-xyChart-fillStyle"
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
    </>
  );
};

const isRangeAnnotation = (
  annotation?: EventAnnotationConfig
): annotation is RangeEventAnnotationConfig => {
  return Boolean(annotation && annotation?.key.type === 'range');
};

const ConfigPanelApplyAsRangeSwitch = ({
  annotation,
  onChange,
  activeData,
  state,
}: {
  annotation?: EventAnnotationConfig;
  onChange: (annotations: Partial<EventAnnotationConfig> | undefined) => void;
  activeData: FramePublicAPI['activeData'];
  state: XYState;
}) => {
  const isRange = isRangeAnnotation(annotation);
  return (
    <EuiFormRow display="columnCompressed" className="lnsRowCompressedMargin">
      <EuiSwitch
        label={i18n.translate('xpack.lens.xyChart.applyAsRange', {
          defaultMessage: 'Apply as range',
        })}
        checked={isRange}
        onChange={() => {
          if (isRange) {
            const newPointAnnotation: PointInTimeEventAnnotationConfig = {
              key: {
                type: 'point_in_time',
                timestamp: annotation.key.timestamp,
              },
              id: annotation.id,
              label:
                annotation.label === defaultRangeAnnotationLabel
                  ? defaultAnnotationLabel
                  : annotation.label,
              color: annotation.color,
              isHidden: annotation.isHidden,
            };
            onChange(newPointAnnotation);
          } else if (annotation) {
            const fromTimestamp = moment(annotation?.key.timestamp);
            const dataLayers = getDataLayers(state.layers);
            const newRangeAnnotation: RangeEventAnnotationConfig = {
              key: {
                type: 'range',
                timestamp: annotation.key.timestamp,
                endTimestamp: getEndTimestamp(fromTimestamp.toISOString(), activeData, dataLayers),
              },
              id: annotation.id,
              label:
                annotation.label === defaultAnnotationLabel
                  ? defaultRangeAnnotationLabel
                  : annotation.label,
              color: annotation.color,
              isHidden: annotation.isHidden,
            };
            onChange(newRangeAnnotation);
          }
        }}
        compressed
      />
    </EuiFormRow>
  );
};

const ConfigPanelRangeDatePicker = ({
  value,
  label,
  prependLabel,
  onChange,
}: {
  value: moment.Moment;
  prependLabel?: string;
  label?: string;
  onChange: (val: moment.Moment | null) => void;
}) => {
  return (
    <EuiFormRow display="rowCompressed" fullWidth label={label} className="lnsRowCompressedMargin">
      {prependLabel ? (
        <EuiFormControlLayout
          className="lnsConfigPanelNoPadding"
          prepend={<EuiFormLabel>{prependLabel}</EuiFormLabel>}
        >
          <EuiDatePicker
            fullWidth
            showTimeSelect
            selected={value}
            onChange={onChange}
            dateFormat="MMM D, YYYY @ HH:mm:ss.SSS"
            data-test-subj="lnsXY_annotation_date_picker"
          />
        </EuiFormControlLayout>
      ) : (
        <EuiDatePicker
          fullWidth
          showTimeSelect
          selected={value}
          onChange={onChange}
          dateFormat="MMM D, YYYY @ HH:mm:ss.SSS"
          data-test-subj="lnsXY_annotation_date_picker"
        />
      )}
    </EuiFormRow>
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
