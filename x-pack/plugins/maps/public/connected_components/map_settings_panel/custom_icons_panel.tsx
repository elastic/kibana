/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import {
  EuiButtonEmpty,
  EuiListGroup,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextAlign,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DEFAULT_CUSTOM_ICON_CUTOFF, DEFAULT_CUSTOM_ICON_RADIUS } from '../../../common/constants';
import { getIsDarkMode } from '../../kibana_services';
import { MapSettings } from '../../reducers/map';
// @ts-expect-error
import { getCustomIconId } from '../../classes/styles/vector/symbol_utils';
import { SymbolIcon } from '../../classes/styles/vector/components/legend/symbol_icon';
import { CustomIconModal } from '../../classes/styles/vector/components/symbol/custom_icon_modal';
import { CustomIcon } from '../../../common/descriptor_types';

interface Props {
  settings: MapSettings;
  updateMapSetting: (settingKey: string, settingValue: string | number | boolean | object) => void;
}

interface State {
  isModalVisible: boolean;
  selectedIcon?: CustomIcon;
}

export class CustomIconsPanel extends Component<Props, State> {
  public state = {
    isModalVisible: false,
    selectedIcon: undefined,
  };

  private _handleIconEdit = (icon: CustomIcon) => {
    this.setState({ selectedIcon: icon, isModalVisible: true }, () => {
      this._showModal();
    });
  };

  private _handleNewIcon = () => {
    this.setState({ isModalVisible: true }, () => {
      this._showModal();
    });
  };

  private _showModal = () => {
    if (!this.state.isModalVisible) {
      return null;
    }
    if (this.state.selectedIcon) {
      const { symbolId, label, svg, cutoff, radius } = this.state.selectedIcon;
      return (
        <CustomIconModal
          title="Edit custom icon"
          symbolId={symbolId}
          label={label}
          svg={svg}
          cutoff={cutoff || DEFAULT_CUSTOM_ICON_CUTOFF}
          radius={radius || DEFAULT_CUSTOM_ICON_RADIUS}
          onSave={this._handleSave}
          onCancel={this._hideModal}
          onDelete={this._handleDelete}
        />
      );
    }
    return (
      <CustomIconModal
        title="Add custom icon"
        cutoff={DEFAULT_CUSTOM_ICON_CUTOFF}
        radius={DEFAULT_CUSTOM_ICON_RADIUS}
        onSave={this._handleSave}
        onCancel={this._hideModal}
      />
    );
  };

  private _hideModal = () => {
    this.setState({ isModalVisible: false, selectedIcon: undefined });
  };

  private _handleSave = (icon: CustomIcon) => {
    const { symbolId, label, svg, cutoff, radius } = icon;

    const icons = [
      ...this.props.settings.customIcons.filter((i) => {
        return i.symbolId !== symbolId;
      }),
      {
        symbolId: symbolId || getCustomIconId(),
        svg,
        label,
        cutoff,
        radius,
      },
    ];
    this.props.updateMapSetting('customIcons', icons);
    this._hideModal();
  };

  private _handleDelete = (symbolId: string) => {
    const icons = [
      ...this.props.settings.customIcons.filter((i) => {
        return i.symbolId !== symbolId;
      }),
    ];
    this.props.updateMapSetting('customIcons', icons);
    this._hideModal();
  };

  private _renderCustomIconsList = () => {
    const addIconButton = (
      <Fragment>
        <EuiTextAlign textAlign="center">
          <EuiButtonEmpty
            size="xs"
            iconType="plusInCircleFilled"
            onClick={() => this._handleNewIcon()}
            data-test-subj="mapsCustomIconPanel-add"
          >
            <FormattedMessage
              id="xpack.maps.mapSettingsPanel.customIconsAddIconButton"
              defaultMessage="Add custom icon"
            />
          </EuiButtonEmpty>
        </EuiTextAlign>
      </Fragment>
    );
    if (!this.props.settings.customIcons.length) {
      return (
        <Fragment>
          <EuiText size="s" textAlign="center">
            <p>
              <EuiTextColor color="subdued">
                <FormattedMessage
                  id="mapSettingsPanel.customIcons.emptyState.description"
                  defaultMessage="Add a custom icon that can be used in layers in this map."
                />
              </EuiTextColor>
            </p>
          </EuiText>
          {addIconButton}
        </Fragment>
      );
    }

    const customIconsList = this.props.settings.customIcons.map((icon) => {
      const { symbolId, label, svg } = icon;
      return {
        label,
        key: symbolId,
        icon: (
          <SymbolIcon
            symbolId={label}
            svg={svg}
            fill={getIsDarkMode() ? 'rgb(223, 229, 239)' : 'rgb(52, 55, 65)'}
          />
        ),
        extraAction: {
          iconType: 'gear',
          alwaysShow: true,
          onClick: () => {
            this._handleIconEdit(icon);
          },
        },
      };
    });

    return (
      <Fragment>
        <EuiListGroup listItems={customIconsList} />
        {addIconButton}
      </Fragment>
    );
  };

  public render() {
    return (
      <Fragment>
        <EuiPanel>
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage
                id="xpack.maps.mapSettingsPanel.customIconsTitle"
                defaultMessage="Custom icons"
              />
            </h5>
          </EuiTitle>
          <EuiSpacer size="m" />
          {this._renderCustomIconsList()}
        </EuiPanel>
        {this._showModal()}
      </Fragment>
    );
  }
}
