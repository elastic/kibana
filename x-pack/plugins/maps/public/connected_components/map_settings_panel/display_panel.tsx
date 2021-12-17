/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiPanel, EuiSwitch, EuiSwitchEvent, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { MapSettings } from '../../reducers/map';
import { MbValidatedColorPicker } from '../../classes/styles/vector/components/color/mb_validated_color_picker';

interface Props {
  settings: MapSettings;
  updateMapSetting: (settingKey: string, settingValue: string | number | boolean) => void;
}

export function DisplayPanel({ settings, updateMapSetting }: Props) {
  const onBackgroundColorChange = (color: string) => {
    updateMapSetting('backgroundColor', color);
  };

  const onShowScale = (event: EuiSwitchEvent) => {
    updateMapSetting('showScaleControl', event.target.checked);
  };

  return (
    <EuiPanel>
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.maps.mapSettingsPanel.displayTitle"
            defaultMessage="Display"
          />
        </h5>
      </EuiTitle>

      <EuiFormRow
        label={i18n.translate('xpack.maps.mapSettingsPanel.backgroundColorLabel', {
          defaultMessage: 'Background color',
        })}
        display="columnCompressed"
      >
        <MbValidatedColorPicker
          color={settings.backgroundColor}
          onChange={onBackgroundColorChange}
        />
      </EuiFormRow>

      <EuiFormRow>
        <EuiSwitch
          label={i18n.translate('xpack.maps.mapSettingsPanel.showScaleLabel', {
            defaultMessage: 'Show scale',
          })}
          checked={settings.showScaleControl}
          onChange={onShowScale}
          compressed
        />
      </EuiFormRow>
    </EuiPanel>
  );
}
