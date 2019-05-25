/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiPanel,
  EuiFormRow,
  EuiFieldText,
  EuiSpacer,
  EuiSwitch,
  EuiToolTip,
} from '@elastic/eui';

import { ValidatedRange } from '../../../shared/components/validated_range';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ValidatedDualRange } from 'ui/validated_range';

const MIN_ZOOM = 0;
const MAX_ZOOM = 24;

export function LayerSettings(props) {

  const onLabelChange = (event) => {
    const label = event.target.value;
    props.updateLabel(props.layerId, label);
  };

  const onZoomChange = ([min, max]) => {
    props.updateMinZoom(props.layerId, Math.max(MIN_ZOOM, parseInt(min, 10)));
    props.updateMaxZoom(props.layerId, Math.min(MAX_ZOOM, parseInt(max, 10)));
  };

  const onAlphaChange = (alpha) => {
    props.updateAlpha(props.layerId, alpha);
  };

  const onApplyGlobalQueryChange = event => {
    props.setLayerApplyGlobalQuery(props.layerId, event.target.checked);
  };

  const renderZoomSliders = () => {
    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.layerPanel.settingsPanel.visibleZoomLabel', {
          defaultMessage: 'Zoom range for layer visibility'
        })}
      >
        <ValidatedDualRange
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          value={[props.minZoom, props.maxZoom]}
          showInput
          showRange
          onChange={onZoomChange}
          allowEmptyRange={false}
        />
      </EuiFormRow>
    );
  };

  const renderLabel = () => {
    return (
      <EuiFormRow
        label={
          i18n.translate('xpack.maps.layerPanel.settingsPanel.layerNameLabel', {
            defaultMessage: 'Layer name'
          })
        }
      >
        <EuiFieldText
          value={props.label}
          onChange={onLabelChange}
        />
      </EuiFormRow>
    );
  };

  const renderAlphaSlider = () => {
    return (
      <EuiFormRow
        label={
          i18n.translate('xpack.maps.layerPanel.settingsPanel.layerTransparencyLabel', {
            defaultMessage: 'Layer transparency'
          })
        }
      >
        <div className="mapAlphaRange">
          <ValidatedRange
            min={.00}
            max={1.00}
            step={.05}
            value={props.alpha}
            onChange={onAlphaChange}
            showLabels
            showInput
            showRange
          />
        </div>
      </EuiFormRow>
    );
  };

  const renderApplyGlobalQueryCheckbox = () => {
    const layerSupportsGlobalQuery = props.layer.getIndexPatternIds().length;

    const applyGlobalQueryCheckbox = (
      <EuiFormRow>
        <EuiSwitch
          label={
            i18n.translate('xpack.maps.layerPanel.applyGlobalQueryCheckboxLabel', {
              defaultMessage: `Apply global filter to layer`
            })
          }
          checked={layerSupportsGlobalQuery ? props.applyGlobalQuery : false}
          onChange={onApplyGlobalQueryChange}
          disabled={!layerSupportsGlobalQuery}
          data-test-subj="mapLayerPanelApplyGlobalQueryCheckbox"
        />
      </EuiFormRow>
    );

    if (layerSupportsGlobalQuery) {
      return applyGlobalQueryCheckbox;
    }

    return (
      <EuiToolTip
        position="top"
        content={
          i18n.translate('xpack.maps.layerPanel.applyGlobalQueryCheckbox.disableTooltip', {
            defaultMessage: `Layer does not support filtering.`
          })
        }
      >
        {applyGlobalQueryCheckbox}
      </EuiToolTip>
    );
  };

  return (
    <Fragment>
      <EuiPanel>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h5>
                <FormattedMessage
                  id="xpack.maps.layerPanel.layerSettingsTitle"
                  defaultMessage="Layer Settings"
                />
              </h5>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m"/>

        {renderLabel()}

        {renderZoomSliders()}

        {renderAlphaSlider()}

        {renderApplyGlobalQueryCheckbox()}
      </EuiPanel>

      <EuiSpacer size="s" />
    </Fragment>
  );
}
