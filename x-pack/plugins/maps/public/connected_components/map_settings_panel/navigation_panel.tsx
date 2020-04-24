/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ChangeEvent } from 'react';
import {
  EuiButtonEmpty,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiRadioGroup,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { MapSettings } from '../../reducers/map';
import { ValidatedDualRange, Value } from '../../../../../../src/plugins/kibana_react/public';
import { INITIAL_LOCATION, MAX_ZOOM, MIN_ZOOM } from '../../../common/constants';
import { MapCenter } from '../../../common/descriptor_types';
// @ts-ignore
import { ValidatedRange } from '../../components/validated_range';

interface Props {
  center: MapCenter;
  settings: MapSettings;
  updateMapSetting: (settingKey: string, settingValue: string | number | boolean) => void;
  zoom: number;
}

const initialLocationOptions = [
  {
    id: INITIAL_LOCATION.LAST_SAVED_LOCATION,
    label: i18n.translate('xpack.maps.mapSettingsPanel.lastSavedLocationLabel', {
      defaultMessage: 'Map location at save',
    }),
  },
  {
    id: INITIAL_LOCATION.FIXED_LOCATION,
    label: i18n.translate('xpack.maps.mapSettingsPanel.fixedLocationLabel', {
      defaultMessage: 'Fixed location',
    }),
  },
  {
    id: INITIAL_LOCATION.BROWSER_LOCATION,
    label: i18n.translate('xpack.maps.mapSettingsPanel.browserLocationLabel', {
      defaultMessage: 'Browser location',
    }),
  },
];

export function NavigationPanel({ center, settings, updateMapSetting, zoom }: Props) {
  const onZoomChange = (value: Value) => {
    updateMapSetting('minZoom', Math.max(MIN_ZOOM, parseInt(value[0] as string, 10)));
    updateMapSetting('maxZoom', Math.min(MAX_ZOOM, parseInt(value[1] as string, 10)));
  };

  const onInitialLocationChange = (optionId: string): void => {
    updateMapSetting('initialLocation', optionId);
  };

  const onInitialLatChange = (event: ChangeEvent<HTMLInputElement>) => {
    let value = parseFloat(event.target.value);
    if (isNaN(value)) {
      value = 0;
    } else if (value < -90) {
      value = -90;
    } else if (value > 90) {
      value = 90;
    }
    updateMapSetting('initialLat', value);
  };

  const onInitialLonChange = (event: ChangeEvent<HTMLInputElement>) => {
    let value = parseFloat(event.target.value);
    if (isNaN(value)) {
      value = 0;
    } else if (value < -180) {
      value = -180;
    } else if (value > 180) {
      value = 180;
    }
    updateMapSetting('initialLon', value);
  };

  const onInitialZoomChange = (value: number) => {
    updateMapSetting('initialZoom', value);
  };

  const useCurrentView = () => {
    updateMapSetting('initialLat', center.lat);
    updateMapSetting('initialLon', center.lon);
    updateMapSetting('initialZoom', Math.round(zoom));
  };

  function renderInitialLocationInputs() {
    if (settings.initialLocation === INITIAL_LOCATION.LAST_SAVED_LOCATION) {
      return null;
    }

    const zoomFormRow = (
      <EuiFormRow
        label={i18n.translate('xpack.maps.mapSettingsPanel.initialZoomLabel', {
          defaultMessage: 'Initial zoom',
        })}
        display="columnCompressed"
      >
        <ValidatedRange
          min={settings.minZoom}
          max={settings.maxZoom}
          step={1}
          value={settings.initialZoom}
          onChange={onInitialZoomChange}
          showInput
          showRange
          compressed
        />
      </EuiFormRow>
    );

    if (settings.initialLocation === INITIAL_LOCATION.BROWSER_LOCATION) {
      return zoomFormRow;
    }

    return (
      <>
        <EuiFormRow
          label={i18n.translate('xpack.maps.mapSettingsPanel.initialLatLabel', {
            defaultMessage: 'Initial latitude',
          })}
          display="columnCompressed"
        >
          <EuiFieldNumber value={settings.initialLat} onChange={onInitialLatChange} compressed />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.maps.mapSettingsPanel.initialLonLabel', {
            defaultMessage: 'Initial longitude',
          })}
          display="columnCompressed"
        >
          <EuiFieldNumber value={settings.initialLon} onChange={onInitialLonChange} compressed />
        </EuiFormRow>
        {zoomFormRow}
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={useCurrentView}>
              <FormattedMessage
                id="xpack.maps.mapSettingsPanel.useCurrentViewBtnLabel"
                defaultMessage="Set to current view"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }

  return (
    <EuiPanel>
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.maps.mapSettingsPanel.navigationTitle"
            defaultMessage="Navigation"
          />
        </h5>
      </EuiTitle>

      <EuiSpacer size="m" />
      <ValidatedDualRange
        label={i18n.translate('xpack.maps.mapSettingsPanel.zoomRangeLabel', {
          defaultMessage: 'Zoom range',
        })}
        formRowDisplay="columnCompressed"
        min={MIN_ZOOM}
        max={MAX_ZOOM}
        value={[settings.minZoom, settings.maxZoom]}
        showInput="inputWithPopover"
        showRange
        showLabels
        onChange={onZoomChange}
        allowEmptyRange={false}
        compressed
      />

      <EuiFormRow
        label={i18n.translate('xpack.maps.source.mapSettingsPanel.initialLocationLabel', {
          defaultMessage: 'Initial map location',
        })}
      >
        <EuiRadioGroup
          options={initialLocationOptions}
          idSelected={settings.initialLocation}
          onChange={onInitialLocationChange}
        />
      </EuiFormRow>
      {renderInitialLocationInputs()}
    </EuiPanel>
  );
}
