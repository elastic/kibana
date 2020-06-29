/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ChangeEvent, Fragment } from 'react';
import {
  EuiTitle,
  EuiPanel,
  EuiFormRow,
  EuiFieldText,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { MAX_ZOOM } from '../../../../common/constants';
import { AlphaSlider } from '../../../components/alpha_slider';
import { ValidatedDualRange } from '../../../../../../../src/plugins/kibana_react/public';

interface Props {
  layer: ILayer | null;
  updateLabel: (layerId: string, label: string) => void;
  updateMinZoom: (layerId: string, minZoom: number) => void;
  updateMaxZoom: (layerId, maxZoom: number) => void;
  updateAlpha: (layerId, alpha: number) => void;
  updateLabelsOnTop: (layerId, labelsOnTop: boolean) => void;
}

export function LayerSettings(props: Props) {
  if (!props.layer) {
    return null;
  }

  const minVisibilityZoom = props.layer.getMinSourceZoom();
  const maxVisibilityZoom = MAX_ZOOM;
  const onLabelChange = (event: ChangeEvent<HTMLInputElement>) => {
    const label = event.target.value;
    props.updateLabel(props.layer.getId(), label);
  };

  const onZoomChange = (value: [string, string]) => {
    props.updateMinZoom(props.layer.getId(), Math.max(minVisibilityZoom, parseInt(value[0], 10)));
    props.updateMaxZoom(props.layer.getId(), Math.min(maxVisibilityZoom, parseInt(value[1], 10)));
  };

  const onAlphaChange = (alpha: number) => {
    props.updateAlpha(props.layer.getId(), alpha);
  };

  const onLabelsOnTopChange = (event: EuiSwitchEvent) => {
    props.updateLabelsOnTop(props.layer.getId(), event.target.checked);
  };

  const renderZoomSliders = () => {
    return (
      <ValidatedDualRange
        label={i18n.translate('xpack.maps.layerPanel.settingsPanel.visibleZoomLabel', {
          defaultMessage: 'Visibility',
        })}
        formRowDisplay="columnCompressed"
        min={minVisibilityZoom}
        max={maxVisibilityZoom}
        value={[props.layer.getMinZoom(), props.layer.getMaxZoom()]}
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
        <EuiFieldText value={props.layer.getLabel()} onChange={onLabelChange} compressed />
      </EuiFormRow>
    );
  };

  const renderShowLabelsOnTop = () => {
    if (!props.layer.supportsLabelsOnTop()) {
      return null;
    }

    return (
      <EuiFormRow display="columnCompressedSwitch">
        <EuiSwitch
          label={i18n.translate('xpack.maps.layerPanel.settingsPanel.labelsOnTop', {
            defaultMessage: `Show labels on top`,
          })}
          checked={props.layer.labelsOnTop()}
          onChange={onLabelsOnTopChange}
          data-test-subj="mapLayerPanelApplyGlobalQueryCheckbox"
          compressed
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
        <AlphaSlider alpha={props.layer.getAlpha()} onChange={onAlphaChange} />
        {renderShowLabelsOnTop()}
      </EuiPanel>

      <EuiSpacer size="s" />
    </Fragment>
  );
}
