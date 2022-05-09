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
import { getIconPaletteOptions, PREFERRED_ICONS } from '../../symbol_utils';
import {
  CustomIcon,
  IconDynamicOptions,
  IconStop,
} from '../../../../../../common/descriptor_types';
import { ICON_SOURCE } from '../../../../../../common/constants';
import { IDynamicStyleProperty } from '../../properties/dynamic_style_property';

const CUSTOM_MAP_ID = 'CUSTOM_MAP_ID';

const DEFAULT_ICON_STOPS: IconStop[] = [
  { stop: null, icon: PREFERRED_ICONS[0], iconSource: ICON_SOURCE.MAKI }, // first stop is the "other" category
  { stop: '', icon: PREFERRED_ICONS[1], iconSource: ICON_SOURCE.MAKI },
];

interface StyleOptionChanges {
  customIconStops?: IconStop[];
  iconPaletteId?: string | null;
  useCustomIconMap: boolean;
}

interface Props {
  customIconStops?: IconStop[];
  iconPaletteId: string | null;
  customIcons: CustomIcon[];
  onCustomIconsChange: (customIcons: CustomIcon[]) => void;
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
    customIconStops: this.props.customIconStops ? this.props.customIconStops : DEFAULT_ICON_STOPS,
  };

  _onMapSelect = (selectedValue: string) => {
    const useCustomIconMap = selectedValue === CUSTOM_MAP_ID;
    const changes: StyleOptionChanges = {
      iconPaletteId: useCustomIconMap ? null : selectedValue,
      useCustomIconMap,
    };
    // edge case when custom palette is first enabled
    // customIconStops is undefined so need to update custom stops with default so icons are rendered.
    if (!this.props.customIconStops) {
      changes.customIconStops = DEFAULT_ICON_STOPS;
    }
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
