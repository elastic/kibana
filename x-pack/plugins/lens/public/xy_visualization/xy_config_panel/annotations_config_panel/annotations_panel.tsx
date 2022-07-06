/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './index.scss';
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiDatePicker,
  EuiFormRow,
  EuiSwitch,
  EuiSwitchEvent,
  EuiButtonGroup,
  EuiFormLabel,
  EuiFormControlLayout,
  EuiText,
  transparentize,
  EuiSpacer,
} from '@elastic/eui';
import type { PaletteRegistry } from '@kbn/coloring';
import moment from 'moment';
import {
  EventAnnotationConfig,
  PointInTimeEventAnnotationConfig,
  PointInTimeQueryEventAnnotationConfig,
  RangeEventAnnotationConfig,
} from '@kbn/event-annotation-plugin/common/types';
import { pick } from 'lodash';
import { search } from '@kbn/data-plugin/public';
import type { DatatableUtilitiesService, Query } from '@kbn/data-plugin/common';
import {
  defaultAnnotationColor,
  defaultAnnotationRangeColor,
  isRangeAnnotation,
  isQueryAnnotation,
} from '@kbn/event-annotation-plugin/public';
import Color from 'color';
import { FieldOptionValue, FieldPicker } from '../../../shared_components/field_picker';
import { getDataLayers } from '../../visualization_helpers';
import { FormatFactory } from '../../../../common';
import { DimensionEditorSection, NameInput, useDebouncedValue } from '../../../shared_components';
import { isHorizontalChart } from '../../state_helpers';
import { defaultAnnotationLabel, defaultRangeAnnotationLabel } from '../../annotations/helpers';
import { ColorPicker } from '../color_picker';
import { IconSelectSetting, TextDecorationSetting } from '../shared/marker_decoration_settings';
import { LineStyleSettings } from '../shared/line_style_settings';
import { updateLayer } from '..';
import { annotationsIconSet } from './icon_set';
import type { FramePublicAPI, VisualizationDimensionEditorProps } from '../../../types';
import { State, XYState, XYAnnotationLayerConfig, XYDataLayerConfig } from '../../types';
import { QueryInput } from '../../../indexpattern_datasource/query_input';

type ManualEventAnnotationType = PointInTimeEventAnnotationConfig | RangeEventAnnotationConfig;

export const toRangeAnnotationColor = (color = defaultAnnotationColor) => {
  return new Color(transparentize(color, 0.1)).hexa();
};

export const toLineAnnotationColor = (color = defaultAnnotationRangeColor) => {
  return new Color(transparentize(color, 1)).hex();
};

export const getEndTimestamp = (
  datatableUtilities: DatatableUtilitiesService,
  startTime: string,
  { activeData, dateRange }: FramePublicAPI,
  dataLayers: XYDataLayerConfig[]
) => {
  const startTimeNumber = moment(startTime).valueOf();
  const dateRangeFraction =
    (moment(dateRange.toDate).valueOf() - moment(dateRange.fromDate).valueOf()) * 0.1;
  const fallbackValue = moment(startTimeNumber + dateRangeFraction).toISOString();
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

  const dateInterval = datatableUtilities.getDateHistogramMeta(xColumn)?.interval;
  if (!dateInterval) return fallbackValue;
  const intervalDuration = search.aggs.parseInterval(dateInterval);
  if (!intervalDuration) return fallbackValue;
  return moment(startTimeNumber + 3 * intervalDuration.as('milliseconds')).toISOString();
};

const sanitizeProperties = (annotation: EventAnnotationConfig) => {
  if (isRangeAnnotation(annotation)) {
    const rangeAnnotation: RangeEventAnnotationConfig = pick(annotation, [
      'type',
      'label',
      'key',
      'id',
      'isHidden',
      'color',
      'outside',
    ]);
    return rangeAnnotation;
  }
  if (isQueryAnnotation(annotation)) {
    const lineAnnotation: PointInTimeQueryEventAnnotationConfig = pick(annotation, [
      'type',
      'id',
      'label',
      'key',
      'isHidden',
      'lineStyle',
      'lineWidth',
      'color',
      'icon',
      'textVisibility',
      'textSource',
      'query',
      'additionalFields',
    ]);
    return lineAnnotation;
  }
  const lineAnnotation: PointInTimeEventAnnotationConfig = pick(annotation, [
    'type',
    'id',
    'label',
    'key',
    'isHidden',
    'lineStyle',
    'lineWidth',
    'color',
    'icon',
    'textVisibility',
  ]);
  return lineAnnotation;
};

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

  const isRange = isRangeAnnotation(currentAnnotation);
  const isQueryBased = isQueryAnnotation(currentAnnotation);

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
                id: `lens_xyChart_annotation_staticDate`,
                label: i18n.translate('xpack.lens.xyChart.annotation.staticDate', {
                  defaultMessage: 'Static Date',
                }),
                'data-test-subj': 'lnsXY_annotation_staticDate',
              },
              {
                id: `lens_xyChart_annotation_query`,
                label: i18n.translate('xpack.lens.xyChart.annotation.query', {
                  defaultMessage: 'Query',
                }),
                'data-test-subj': 'lnsXY_annotation_query',
              },
            ]}
            idSelected={`lens_xyChart_annotation_${
              currentAnnotation?.type === 'query' ? 'query' : 'staticDate'
            }`}
            onChange={(id) => {
              setAnnotations({
                type: id === `lens_xyChart_annotation_query` ? 'query' : 'manual',
              });
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
                return (
                  <>
                    <EuiSpacer size="xs" />
                    <FieldPicker
                      options={[]}
                      onChoose={function (choice: FieldOptionValue | undefined): void {
                        throw new Error('Function not implemented.');
                      }}
                      fieldIsInvalid={false}
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
    </>
  );
};

export const defaultQuery: Query = {
  query: '',
  language: 'kuery',
};

const ConfigPanelQueryAnnotation = ({
  annotation,
  frame,
  state,
  onChange,
}: {
  annotation?: PointInTimeQueryEventAnnotationConfig;
  onChange: (annotations: Partial<PointInTimeQueryEventAnnotationConfig> | undefined) => void;
  frame: FramePublicAPI;
  state: XYState;
}) => {
  const inputQuery = annotation?.query ?? defaultQuery;
  // list only supported field by operation, remove the rest
  const options = [];
  return (
    <>
      <EuiFormRow
        display="rowCompressed"
        className="lnsRowCompressedMargin"
        fullWidth
        label={i18n.translate('xpack.lens.xyChart.annotation.queryField', {
          defaultMessage: 'Target date field',
        })}
      >
        <FieldPicker
          options={[]}
          onChoose={function (choice: FieldOptionValue | undefined): void {
            throw new Error('Function not implemented.');
          }}
          fieldIsInvalid={false}
        />
      </EuiFormRow>
      <EuiFormRow
        display="rowCompressed"
        className="lnsRowCompressedMargin"
        fullWidth
        label={i18n.translate('xpack.lens.xyChart.annotation.queryInput', {
          defaultMessage: 'Annotation query',
        })}
      >
        <QueryInput
          value={inputQuery}
          onChange={function (input: Query): void {
            throw new Error('Function not implemented.');
          }}
          indexPatternTitle={''}
          isInvalid={false}
          onSubmit={() => {}}
          placeholder={
            inputQuery.language === 'kuery'
              ? i18n.translate('xpack.lens.annotations.query.queryPlaceholderKql', {
                  defaultMessage: '{example}',
                  values: { example: 'method : "GET"' },
                })
              : i18n.translate('xpack.lens.annotations.query.queryPlaceholderLucene', {
                  defaultMessage: '{example}',
                  values: { example: 'method:GET' },
                })
          }
        />
      </EuiFormRow>
    </>
  );
};

const ConfigPanelManualAnnotation = ({
  annotation,
  frame,
  state,
  onChange,
  datatableUtilities,
}: {
  annotation?: ManualEventAnnotationType | undefined;
  onChange: (annotations: Partial<ManualEventAnnotationType | undefined> | undefined) => void;
  datatableUtilities: DatatableUtilitiesService;
  frame: FramePublicAPI;
  state: XYState;
}) => {
  const isRange = isRangeAnnotation(annotation);
  return (
    <>
      {isRange ? (
        <>
          <ConfigPanelRangeDatePicker
            dataTestSubj="lns-xyAnnotation-fromTime"
            prependLabel={i18n.translate('xpack.lens.xyChart.annotationDate.from', {
              defaultMessage: 'From',
            })}
            value={moment(annotation?.key.timestamp)}
            onChange={(date) => {
              if (date) {
                const currentEndTime = moment(annotation?.key.endTimestamp).valueOf();
                if (currentEndTime < date.valueOf()) {
                  const currentStartTime = moment(annotation?.key.timestamp).valueOf();
                  const dif = currentEndTime - currentStartTime;
                  onChange({
                    key: {
                      ...(annotation?.key || { type: 'range' }),
                      timestamp: date.toISOString(),
                      endTimestamp: moment(date.valueOf() + dif).toISOString(),
                    },
                  });
                } else {
                  onChange({
                    key: {
                      ...(annotation?.key || { type: 'range' }),
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
            dataTestSubj="lns-xyAnnotation-toTime"
            prependLabel={i18n.translate('xpack.lens.xyChart.annotationDate.to', {
              defaultMessage: 'To',
            })}
            value={moment(annotation?.key.endTimestamp)}
            onChange={(date) => {
              if (date) {
                const currentStartTime = moment(annotation?.key.timestamp).valueOf();
                if (currentStartTime > date.valueOf()) {
                  const currentEndTime = moment(annotation?.key.endTimestamp).valueOf();
                  const dif = currentEndTime - currentStartTime;
                  onChange({
                    key: {
                      ...(annotation?.key || { type: 'range' }),
                      endTimestamp: date.toISOString(),
                      timestamp: moment(date.valueOf() - dif).toISOString(),
                    },
                  });
                } else {
                  onChange({
                    key: {
                      ...(annotation?.key || { type: 'range' }),
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
          dataTestSubj="lns-xyAnnotation-time"
          label={i18n.translate('xpack.lens.xyChart.annotationDate', {
            defaultMessage: 'Annotation date',
          })}
          value={moment(annotation?.key.timestamp)}
          onChange={(date) => {
            if (date) {
              onChange({
                key: {
                  ...(annotation?.key || { type: 'point_in_time' }),
                  timestamp: date.toISOString(),
                },
              });
            }
          }}
        />
      )}
      <ConfigPanelApplyAsRangeSwitch
        annotation={annotation}
        onChange={onChange}
        datatableUtilities={datatableUtilities}
        frame={frame}
        state={state}
      />
    </>
  );
};

const ConfigPanelApplyAsRangeSwitch = ({
  annotation,
  datatableUtilities,
  onChange,
  frame,
  state,
}: {
  annotation?: ManualEventAnnotationType;
  datatableUtilities: DatatableUtilitiesService;
  onChange: (annotations: Partial<ManualEventAnnotationType> | undefined) => void;
  frame: FramePublicAPI;
  state: XYState;
}) => {
  const isRange = isRangeAnnotation(annotation);
  return (
    <EuiFormRow display="columnCompressed" className="lnsRowCompressedMargin">
      <EuiSwitch
        data-test-subj="lns-xyAnnotation-rangeSwitch"
        label={
          <EuiText size="xs">
            {i18n.translate('xpack.lens.xyChart.applyAsRange', {
              defaultMessage: 'Apply as range',
            })}
          </EuiText>
        }
        checked={isRange}
        onChange={() => {
          if (isRange) {
            const newPointAnnotation: PointInTimeEventAnnotationConfig = {
              type: 'manual',
              key: {
                type: 'point_in_time',
                timestamp: annotation.key.timestamp,
              },
              id: annotation.id,
              label:
                annotation.label === defaultRangeAnnotationLabel
                  ? defaultAnnotationLabel
                  : annotation.label,
              color: toLineAnnotationColor(annotation.color),
              isHidden: annotation.isHidden,
            };
            onChange(newPointAnnotation);
          } else if (annotation) {
            const fromTimestamp = moment(annotation?.key.timestamp);
            const dataLayers = getDataLayers(state.layers);
            const newRangeAnnotation: RangeEventAnnotationConfig = {
              type: 'manual',
              key: {
                type: 'range',
                timestamp: annotation.key.timestamp,
                endTimestamp: getEndTimestamp(
                  datatableUtilities,
                  fromTimestamp.toISOString(),
                  frame,
                  dataLayers
                ),
              },
              id: annotation.id,
              label:
                annotation.label === defaultAnnotationLabel
                  ? defaultRangeAnnotationLabel
                  : annotation.label,
              color: toRangeAnnotationColor(annotation.color),
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
  dataTestSubj = 'lnsXY_annotation_date_picker',
}: {
  value: moment.Moment;
  prependLabel?: string;
  label?: string;
  onChange: (val: moment.Moment | null) => void;
  dataTestSubj?: string;
}) => {
  return (
    <EuiFormRow display="rowCompressed" fullWidth label={label} className="lnsRowCompressedMargin">
      {prependLabel ? (
        <EuiFormControlLayout
          fullWidth
          className="lnsConfigPanelNoPadding"
          prepend={
            <EuiFormLabel className="lnsConfigPanelDate__label">{prependLabel}</EuiFormLabel>
          }
        >
          <EuiDatePicker
            fullWidth
            showTimeSelect
            selected={value}
            onChange={onChange}
            dateFormat="MMM D, YYYY @ HH:mm:ss.SSS"
            data-test-subj={dataTestSubj}
          />
        </EuiFormControlLayout>
      ) : (
        <EuiDatePicker
          fullWidth
          showTimeSelect
          selected={value}
          onChange={onChange}
          dateFormat="MMM D, YYYY @ HH:mm:ss.SSS"
          data-test-subj={dataTestSubj}
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
