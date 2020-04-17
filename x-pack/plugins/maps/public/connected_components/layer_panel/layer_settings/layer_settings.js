/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { EuiTitle, EuiPanel, EuiFormRow, EuiFieldText, EuiSpacer } from '@elastic/eui';

import { ValidatedRange } from '../../../components/validated_range';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ValidatedDualRange } from '../../../../../../../src/plugins/kibana_react/public';
export function LayerSettings(props) {
  const onLabelChange = event => {
    const label = event.target.value;
    props.updateLabel(props.layerId, label);
  };

  const onZoomChange = ([min, max]) => {
    props.updateMinZoom(props.layerId, Math.max(props.minVisibilityZoom, parseInt(min, 10)));
    props.updateMaxZoom(props.layerId, Math.min(props.maxVisibilityZoom, parseInt(max, 10)));
  };

  const onAlphaChange = alpha => {
    const alphaDecimal = alpha / 100;
    props.updateAlpha(props.layerId, alphaDecimal);
  };

  const renderZoomSliders = () => {
    return (
      <ValidatedDualRange
        label={i18n.translate('xpack.maps.layerPanel.settingsPanel.visibleZoomLabel', {
          defaultMessage: 'Visibility',
        })}
        formRowDisplay="columnCompressed"
        min={props.minVisibilityZoom}
        max={props.maxVisibilityZoom}
        value={[props.minZoom, props.maxZoom]}
        showInput="inputWithPopover"
        showRange
        showLabels
        onChange={onZoomChange}
        allowEmptyRange={false}
        compressed
        prepend={i18n.translate('xpack.maps.layerPanel.settingsPanel.visibleZoom', {
          defaultMessage: 'Zoom levels',
        })}
      />
    );
  };

  const renderLabel = () => {
    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.layerPanel.settingsPanel.layerNameLabel', {
          defaultMessage: 'Name',
        })}
        display="columnCompressed"
      >
        <EuiFieldText value={props.label} onChange={onLabelChange} compressed />
      </EuiFormRow>
    );
  };

  const renderAlphaSlider = () => {
    const alphaPercent = Math.round(props.alpha * 100);

    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.layerPanel.settingsPanel.layerTransparencyLabel', {
          defaultMessage: 'Opacity',
        })}
        display="columnCompressed"
      >
        <ValidatedRange
          min={0}
          max={100}
          step={1}
          value={alphaPercent}
          onChange={onAlphaChange}
          showInput
          showRange
          compressed
          append={i18n.translate('xpack.maps.layerPanel.settingsPanel.percentageLabel', {
            defaultMessage: '%',
            description: 'Percentage',
          })}
        />
      </EuiFormRow>
    );
  };

  return (
    <Fragment>
      <EuiPanel>
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage
              id="xpack.maps.layerPanel.layerSettingsTitle"
              defaultMessage="Layer settings"
            />
          </h5>
        </EuiTitle>

        <EuiSpacer size="m" />
        {renderLabel()}
        {renderZoomSliders()}
        {renderAlphaSlider()}
      </EuiPanel>

      <EuiSpacer size="s" />
    </Fragment>
  );
}
