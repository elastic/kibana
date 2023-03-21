/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiPanel, EuiSpacer, EuiSwitch, EuiSwitchEvent, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { MapSettings } from '../../../common/descriptor_types';
import { AlphaSlider } from '../../components/alpha_slider';
import { MbValidatedColorPicker } from '../../classes/styles/vector/components/color/mb_validated_color_picker';

interface Props {
  settings: MapSettings;
  updateMapSetting: (settingKey: string, settingValue: string | number | boolean) => void;
}

export function SpatialFiltersPanel({ settings, updateMapSetting }: Props) {
  const onAlphaChange = (alpha: number) => {
    updateMapSetting('spatialFiltersAlpa', alpha);
  };

  const onFillColorChange = (color: string) => {
    updateMapSetting('spatialFiltersFillColor', color);
  };

  const onLineColorChange = (color: string) => {
    updateMapSetting('spatialFiltersLineColor', color);
  };

  const onShowSpatialFiltersChange = (event: EuiSwitchEvent) => {
    updateMapSetting('showSpatialFilters', event.target.checked);
  };

  const renderStyleInputs = () => {
    if (!settings.showSpatialFilters) {
      return null;
    }

    return (
      <>
        <AlphaSlider alpha={settings.spatialFiltersAlpa} onChange={onAlphaChange} />

        <EuiFormRow
          label={i18n.translate('xpack.maps.mapSettingsPanel.spatialFiltersFillColorLabel', {
            defaultMessage: 'Fill color',
          })}
          display="columnCompressed"
        >
          <MbValidatedColorPicker
            color={settings.spatialFiltersFillColor}
            onChange={onFillColorChange}
          />
        </EuiFormRow>

        <EuiFormRow
          label={i18n.translate('xpack.maps.mapSettingsPanel.spatialFiltersLineColorLabel', {
            defaultMessage: 'Border color',
          })}
          display="columnCompressed"
        >
          <MbValidatedColorPicker
            color={settings.spatialFiltersLineColor}
            onChange={onLineColorChange}
          />
        </EuiFormRow>
      </>
    );
  };

  return (
    <EuiPanel>
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.maps.mapSettingsPanel.spatialFiltersTitle"
            defaultMessage="Spatial filters"
          />
        </h5>
      </EuiTitle>

      <EuiSpacer size="m" />
      <EuiFormRow>
        <EuiSwitch
          label={i18n.translate('xpack.maps.mapSettingsPanel.showSpatialFiltersLabel', {
            defaultMessage: 'Show spatial filters on map',
          })}
          checked={settings.showSpatialFilters}
          onChange={onShowSpatialFiltersChange}
          compressed
        />
      </EuiFormRow>
      {renderStyleInputs()}
    </EuiPanel>
  );
}
