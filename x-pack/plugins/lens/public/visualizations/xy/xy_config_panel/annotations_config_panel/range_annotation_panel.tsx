/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatatableUtilitiesService } from '@kbn/data-plugin/common';
import type {
  PointInTimeEventAnnotationConfig,
  RangeEventAnnotationConfig,
} from '@kbn/event-annotation-plugin/common';
import { isRangeAnnotationConfig } from '@kbn/event-annotation-plugin/public';
import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  EuiFormRow,
  EuiSwitch,
  EuiText,
  EuiFormControlLayout,
  EuiFormLabel,
  EuiDatePicker,
} from '@elastic/eui';
import moment from 'moment';
import { DONT_CLOSE_DIMENSION_CONTAINER_ON_CLICK_CLASS } from '../../../../utils';
import type { FramePublicAPI } from '../../../../types';
import { defaultRangeAnnotationLabel, defaultAnnotationLabel } from '../../annotations/helpers';
import type { XYState } from '../../types';
import { getDataLayers } from '../../visualization_helpers';
import { toLineAnnotationColor, getEndTimestamp, toRangeAnnotationColor } from './helpers';
import type { ManualEventAnnotationType } from './types';

export const ConfigPanelApplyAsRangeSwitch = ({
  annotation,
  datatableUtilities,
  onChange,
  frame,
  state,
}: {
  annotation?: ManualEventAnnotationType;
  datatableUtilities: DatatableUtilitiesService;
  onChange: <T extends ManualEventAnnotationType>(annotations: Partial<T> | undefined) => void;
  frame: FramePublicAPI;
  state: XYState;
}) => {
  const isRange = isRangeAnnotationConfig(annotation);
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

export const ConfigPanelRangeDatePicker = ({
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
            calendarClassName={DONT_CLOSE_DIMENSION_CONTAINER_ON_CLICK_CLASS}
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
          calendarClassName={DONT_CLOSE_DIMENSION_CONTAINER_ON_CLICK_CLASS}
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
