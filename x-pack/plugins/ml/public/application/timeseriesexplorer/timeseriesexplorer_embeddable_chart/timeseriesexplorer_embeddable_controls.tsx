/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TimeseriesExplorerCheckbox } from './timeseriesexplorer_checkbox';

interface Props {
  showAnnotationsCheckbox: boolean;
  showAnnotations: boolean;
  showForecastCheckbox: boolean;
  showForecast: boolean;
  showModelBoundsCheckbox: boolean;
  showModelBounds: boolean;
  onShowModelBoundsChange: () => void;
  onShowAnnotationsChange: () => void;
  onShowForecastChange: () => void;
}

export const TimeSeriesExplorerEmbeddableControls: FC<Props> = ({
  onShowAnnotationsChange,
  onShowForecastChange,
  onShowModelBoundsChange,
  showAnnotations,
  showAnnotationsCheckbox,
  showForecast,
  showForecastCheckbox,
  showModelBounds,
  showModelBoundsCheckbox,
}) => (
  <>
    {showModelBoundsCheckbox && (
      <TimeseriesExplorerCheckbox
        id="toggleModelBoundsCheckbox"
        label={i18n.translate('xpack.ml.timeSeriesExplorer.showModelBoundsLabel', {
          defaultMessage: 'show model bounds',
        })}
        checked={showModelBounds}
        onChange={onShowModelBoundsChange}
      />
    )}
    {showAnnotationsCheckbox && (
      <TimeseriesExplorerCheckbox
        id="toggleAnnotationsCheckbox"
        label={i18n.translate('xpack.ml.timeSeriesExplorer.annotationsLabel', {
          defaultMessage: 'annotations',
        })}
        checked={showAnnotations}
        onChange={onShowAnnotationsChange}
      />
    )}
    {showForecastCheckbox && (
      <EuiFlexItem grow={false}>
        <TimeseriesExplorerCheckbox
          id="toggleShowForecastCheckbox"
          // @ts-ignore string expected
          label={
            <span data-test-subj={'mlForecastCheckbox'}>
              {i18n.translate('xpack.ml.timeSeriesExplorer.showForecastLabel', {
                defaultMessage: 'show forecast',
              })}
            </span>
          }
          checked={showForecast}
          onChange={onShowForecastChange}
        />
      </EuiFlexItem>
    )}
  </>
);
