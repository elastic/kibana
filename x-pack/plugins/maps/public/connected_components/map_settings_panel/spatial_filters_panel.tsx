/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { MapSettings } from '../../reducers/map';
import { AlphaSlider } from '../../components/alpha_slider';

interface Props {
  settings: MapSettings;
  updateMapSetting: (settingKey: string, settingValue: string | number | boolean) => void;
}

export function SpatialFiltersPanel({ settings, updateMapSetting }: Props) {
  const onAlphaChange = (alpha: number) => {
    updateMapSetting('spatialFiltersAlpa', alpha);
  };

  const renderStyleInputs = () => {
    if (!settings.showSpatialFilters) {
      return null;
    }

    return (
      <>
        <AlphaSlider alpha={settings.spatialFiltersAlpa} onChange={onAlphaChange} />
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
      {renderStyleInputs()}
    </EuiPanel>
  );
}
