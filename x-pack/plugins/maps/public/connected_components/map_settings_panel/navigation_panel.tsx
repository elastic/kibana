/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  EuiSwitch,
  EuiSwitchEvent,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ValidatedDualRange, Value } from '@kbn/kibana-react-plugin/public';
import { MapSettings } from '../../reducers/map';
import { INITIAL_LOCATION, MAX_ZOOM, MIN_ZOOM } from '../../../common/constants';
import { MapCenter } from '../../../common/descriptor_types';
// @ts-ignore
import { ValidatedRange } from '../../components/validated_range';

interface Props {
  center: MapCenter;
  settings: MapSettings;
  updateMapSetting: (settingKey: string, settingValue: string | number | boolean | object) => void;
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
    id: INITIAL_LOCATION.AUTO_FIT_TO_BOUNDS,
    label: i18n.translate('xpack.maps.mapSettingsPanel.autoFitToBoundsLocationLabel', {
      defaultMessage: 'Auto fit map to data bounds',
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
  const onAutoFitToDataBoundsChange = (event: EuiSwitchEvent) => {
    updateMapSetting('autoFitToDataBounds', event.target.checked);
  };

  const onZoomChange = (value: Value) => {
    const minZoom = Math.max(MIN_ZOOM, parseInt(value[0] as string, 10));
    const maxZoom = Math.min(MAX_ZOOM, parseInt(value[1] as string, 10));
    updateMapSetting('minZoom', minZoom);
    updateMapSetting('maxZoom', maxZoom);

    // ensure fixed zoom and browser zoom stay within defined min/max
    if (settings.fixedLocation.zoom < minZoom) {
      onFixedZoomChange(minZoom);
    } else if (settings.fixedLocation.zoom > maxZoom) {
      onFixedZoomChange(maxZoom);
    }

    if (settings.browserLocation.zoom < minZoom) {
      onBrowserZoomChange(minZoom);
    } else if (settings.browserLocation.zoom > maxZoom) {
      onBrowserZoomChange(maxZoom);
    }
  };

  const onInitialLocationChange = (optionId: string): void => {
    updateMapSetting('initialLocation', optionId);
  };

  const onFixedLatChange = (event: ChangeEvent<HTMLInputElement>) => {
    let value = parseFloat(event.target.value);
    if (isNaN(value)) {
      value = 0;
    } else if (value < -90) {
      value = -90;
    } else if (value > 90) {
      value = 90;
    }
    updateMapSetting('fixedLocation', { ...settings.fixedLocation, lat: value });
  };

  const onFixedLonChange = (event: ChangeEvent<HTMLInputElement>) => {
    let value = parseFloat(event.target.value);
    if (isNaN(value)) {
      value = 0;
    } else if (value < -180) {
      value = -180;
    } else if (value > 180) {
      value = 180;
    }
    updateMapSetting('fixedLocation', { ...settings.fixedLocation, lon: value });
  };

  const onFixedZoomChange = (value: number) => {
    updateMapSetting('fixedLocation', { ...settings.fixedLocation, zoom: value });
  };

  const onBrowserZoomChange = (value: number) => {
    updateMapSetting('browserLocation', { zoom: value });
  };

  const useCurrentView = () => {
    updateMapSetting('fixedLocation', {
      lat: center.lat,
      lon: center.lon,
      zoom: Math.round(zoom),
    });
  };

  function renderInitialLocationInputs() {
    if (
      settings.initialLocation === INITIAL_LOCATION.LAST_SAVED_LOCATION ||
      settings.initialLocation === INITIAL_LOCATION.AUTO_FIT_TO_BOUNDS
    ) {
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
          value={
            settings.initialLocation === INITIAL_LOCATION.BROWSER_LOCATION
              ? settings.browserLocation.zoom
              : settings.fixedLocation.zoom
          }
          onChange={
            settings.initialLocation === INITIAL_LOCATION.BROWSER_LOCATION
              ? onBrowserZoomChange
              : onFixedZoomChange
          }
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
          <EuiFieldNumber
            value={settings.fixedLocation.lat}
            onChange={onFixedLatChange}
            compressed
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.maps.mapSettingsPanel.initialLonLabel', {
            defaultMessage: 'Initial longitude',
          })}
          display="columnCompressed"
        >
          <EuiFieldNumber
            value={settings.fixedLocation.lon}
            onChange={onFixedLonChange}
            compressed
          />
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
      <EuiFormRow>
        <EuiSwitch
          label={i18n.translate('xpack.maps.mapSettingsPanel.autoFitToDataBoundsLabel', {
            defaultMessage: 'Auto fit map to data bounds',
          })}
          checked={settings.autoFitToDataBounds}
          onChange={onAutoFitToDataBoundsChange}
          compressed
          data-test-subj="autoFitToDataBoundsSwitch"
        />
      </EuiFormRow>

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

      <EuiSpacer size="m" />
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
