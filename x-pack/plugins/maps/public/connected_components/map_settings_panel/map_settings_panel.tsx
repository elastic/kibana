/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { MapSettings } from '../../reducers/map';
import { NavigationPanel } from './navigation_panel';
import { SpatialFiltersPanel } from './spatial_filters_panel';
import { DisplayPanel } from './display_panel';
import { CustomIconsPanel } from './custom_icons_panel';
import { MapCenter } from '../../../common/descriptor_types';

export interface Props {
  cancelChanges: () => void;
  center: MapCenter;
  hasMapSettingsChanges: boolean;
  keepChanges: () => void;
  settings: MapSettings;
  updateMapSetting: (settingKey: string, settingValue: string | number | boolean | object) => void;
  deleteCustomIcon: (symbolId: string) => void;
  zoom: number;
}

export function MapSettingsPanel({
  cancelChanges,
  center,
  hasMapSettingsChanges,
  keepChanges,
  settings,
  updateMapSetting,
  deleteCustomIcon,
  zoom,
}: Props) {
  // TODO move common text like Cancel and Close to common i18n translation
  const closeBtnLabel = hasMapSettingsChanges
    ? i18n.translate('xpack.maps.mapSettingsPanel.cancelLabel', {
        defaultMessage: 'Cancel',
      })
    : i18n.translate('xpack.maps.mapSettingsPanel.closeLabel', {
        defaultMessage: 'Close',
      });

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlyoutHeader hasBorder className="mapLayerPanel__header">
        <EuiTitle size="s">
          <h2>
            <FormattedMessage
              id="xpack.maps.mapSettingsPanel.title"
              defaultMessage="Map settings"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <div className="mapLayerPanel__body">
        <div className="mapLayerPanel__bodyOverflow">
          <DisplayPanel settings={settings} updateMapSetting={updateMapSetting} />
          <EuiSpacer size="s" />
          <NavigationPanel
            center={center}
            settings={settings}
            updateMapSetting={updateMapSetting}
            zoom={zoom}
          />
          <EuiSpacer size="s" />
          <SpatialFiltersPanel settings={settings} updateMapSetting={updateMapSetting} />
          <EuiSpacer size="s" />
          <CustomIconsPanel
            settings={settings}
            updateMapSetting={updateMapSetting}
            deleteCustomIcon={deleteCustomIcon}
          />
        </div>
      </div>

      <EuiFlyoutFooter className="mapLayerPanel__footer">
        <EuiFlexGroup responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={cancelChanges}
              flush="left"
              data-test-subj="layerPanelCancelButton"
            >
              {closeBtnLabel}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiSpacer />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              disabled={!hasMapSettingsChanges}
              iconType="check"
              onClick={keepChanges}
              fill
              data-test-subj="mapSettingSubmitButton"
            >
              <FormattedMessage
                id="xpack.maps.mapSettingsPanel.keepChangesButtonLabel"
                defaultMessage="Keep changes"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlexGroup>
  );
}
