/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatatableUtilitiesService } from '@kbn/data-plugin/common';
import { isRangeAnnotationConfig } from '@kbn/event-annotation-plugin/public';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React from 'react';
import type { FramePublicAPI } from '../../../../types';
import type { XYState } from '../../types';
import {
  ConfigPanelRangeDatePicker,
  ConfigPanelApplyAsRangeSwitch,
} from './range_annotation_panel';
import type { ManualEventAnnotationType } from './types';

export const ConfigPanelManualAnnotation = ({
  annotation,
  frame,
  state,
  onChange,
  datatableUtilities,
}: {
  annotation?: ManualEventAnnotationType | undefined;
  onChange: <T extends ManualEventAnnotationType>(annotation: Partial<T> | undefined) => void;
  datatableUtilities: DatatableUtilitiesService;
  frame: FramePublicAPI;
  state: XYState;
}) => {
  const isRange = isRangeAnnotationConfig(annotation);
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
