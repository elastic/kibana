/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import { EuiSuperSelect, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
// @ts-expect-error
import { IconStops } from './icon_stops';
// @ts-expect-error
import { getIconPaletteOptions } from '../../symbol_utils';
import {
  CustomIcon,
  IconDynamicOptions,
  IconStop,
} from '../../../../../../common/descriptor_types';
import { IDynamicStyleProperty } from '../../properties/dynamic_style_property';

const CUSTOM_MAP_ID = 'CUSTOM_MAP_ID';

interface StyleOptionChanges {
  customIconStops?: IconStop[];
  iconPaletteId?: string | null;
  useCustomIconMap: boolean;
}

interface Props {
  customIconStops: IconStop[];
  iconPaletteId: string | null;
  customIcons?: Record<string, CustomIcon>;
  onCustomIconsChange?: (customIcons: CustomIcon[]) => void;
  onChange: ({ customIconStops, iconPaletteId, useCustomIconMap }: StyleOptionChanges) => void;
  styleProperty: IDynamicStyleProperty<IconDynamicOptions>;
  useCustomIconMap?: boolean;
  isCustomOnly: boolean;
}

interface State {
  customIconStops: IconStop[];
}

export class IconMapSelect extends Component<Props, State> {
  state = {
    customIconStops: this.props.customIconStops,
  };

  _onMapSelect = (selectedValue: string) => {
    const useCustomIconMap = selectedValue === CUSTOM_MAP_ID;
    const changes: StyleOptionChanges = {
      iconPaletteId: useCustomIconMap ? null : selectedValue,
      useCustomIconMap,
    };
    this.props.onChange(changes);
  };

  _onCustomMapChange = ({
    customStops,
    isInvalid,
  }: {
    customStops: IconStop[];
    isInvalid: boolean;
  }) => {
    // Manage invalid custom map in local state
    this.setState({ customIconStops: customStops });

    if (!isInvalid) {
      this.props.onChange({
        useCustomIconMap: true,
        customIconStops: customStops,
      });
    }
  };

  _renderCustomStopsInput() {
    return !this.props.isCustomOnly && !this.props.useCustomIconMap ? null : (
      <IconStops
        field={this.props.styleProperty.getField()}
        getValueSuggestions={this.props.styleProperty.getValueSuggestions}
        iconStops={this.state.customIconStops}
        onChange={this._onCustomMapChange}
        onCustomIconsChange={this.props.onCustomIconsChange}
        customIcons={this.props.customIcons}
      />
    );
  }

  _renderMapSelect() {
    if (this.props.isCustomOnly) {
      return null;
    }

    const mapOptionsWithCustom = [
      {
        value: CUSTOM_MAP_ID,
        inputDisplay: i18n.translate('xpack.maps.styles.icon.customMapLabel', {
          defaultMessage: 'Custom icon palette',
        }),
      },
      ...getIconPaletteOptions(),
    ];

    let valueOfSelected = '';
    if (this.props.useCustomIconMap) {
      valueOfSelected = CUSTOM_MAP_ID;
    } else if (this.props.iconPaletteId) {
      valueOfSelected = this.props.iconPaletteId;
    }

    return (
      <Fragment>
        <EuiSuperSelect
          options={mapOptionsWithCustom}
          onChange={this._onMapSelect}
          valueOfSelected={valueOfSelected}
          hasDividers={true}
          compressed
        />
        <EuiSpacer size="s" />
      </Fragment>
    );
  }

  render() {
    return (
      <Fragment>
        {this._renderMapSelect()}
        {this._renderCustomStopsInput()}
      </Fragment>
    );
  }
}
