/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment, ReactElement } from 'react';
import {
  EuiFormRow,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getVectorStyleLabel, getDisabledByMessage } from './get_vector_style_label';
import { STYLE_TYPE, VECTOR_STYLES } from '../../../../../common/constants';
import { CustomIcon } from '../../../../../common/descriptor_types';
import { IStyleProperty } from '../properties/style_property';
import { StyleField } from '../style_fields_helper';

export interface Props<StaticOptions, DynamicOptions> {
  children: ReactElement<any>;
  customStaticOptionLabel?: string;
  defaultStaticStyleOptions: StaticOptions;
  defaultDynamicStyleOptions: DynamicOptions;
  disabled?: boolean;
  disabledBy?: VECTOR_STYLES;
  customIcons?: Record<string, CustomIcon>;
  fields: StyleField[];
  onDynamicStyleChange: (propertyName: VECTOR_STYLES, options: DynamicOptions) => void;
  onStaticStyleChange: (propertyName: VECTOR_STYLES, options: StaticOptions) => void;
  onCustomIconsChange?: (customIcons: Record<string, CustomIcon>) => void;
  styleProperty: IStyleProperty<StaticOptions | DynamicOptions>;
}

export class StylePropEditor<StaticOptions, DynamicOptions> extends Component<
  Props<StaticOptions, DynamicOptions>
> {
  private _prevStaticStyleOptions = this.props.defaultStaticStyleOptions;
  private _prevDynamicStyleOptions = this.props.defaultDynamicStyleOptions;

  _onTypeToggle = () => {
    if (this.props.styleProperty.isDynamic()) {
      // preserve current dynmaic style
      this._prevDynamicStyleOptions = this.props.styleProperty.getOptions() as DynamicOptions;
      // toggle to static style
      this.props.onStaticStyleChange(
        this.props.styleProperty.getStyleName(),
        this._prevStaticStyleOptions
      );
    } else {
      // preserve current static style
      this._prevStaticStyleOptions = this.props.styleProperty.getOptions() as StaticOptions;
      // toggle to dynamic style
      this.props.onDynamicStyleChange(
        this.props.styleProperty.getStyleName(),
        this._prevDynamicStyleOptions
      );
    }
  };

  _onDataMappingChange = (updatedObjects: Partial<DynamicOptions>) => {
    const options = {
      ...(this.props.styleProperty.getOptions() as DynamicOptions),
      ...updatedObjects,
    };
    this.props.onDynamicStyleChange(this.props.styleProperty.getStyleName(), options);
  };

  renderStaticDynamicSelect() {
    const options = [
      {
        value: STYLE_TYPE.STATIC,
        text: this.props.customStaticOptionLabel
          ? this.props.customStaticOptionLabel
          : i18n.translate('xpack.maps.styles.staticDynamicSelect.staticLabel', {
              defaultMessage: 'Fixed',
            }),
      },
      {
        value: STYLE_TYPE.DYNAMIC,
        text: i18n.translate('xpack.maps.styles.staticDynamicSelect.dynamicLabel', {
          defaultMessage: 'By value',
        }),
      },
    ];

    return (
      <EuiSelect
        options={options}
        value={this.props.styleProperty.isDynamic() ? STYLE_TYPE.DYNAMIC : STYLE_TYPE.STATIC}
        onChange={this._onTypeToggle}
        disabled={this.props.disabled || this.props.fields.length === 0}
        aria-label={i18n.translate('xpack.maps.styles.staticDynamicSelect.ariaLabel', {
          defaultMessage: 'Select to style by fixed value or by data value',
        })}
        compressed
        data-test-subj={`staticDynamicSelect_${this.props.styleProperty.getStyleName()}`}
      />
    );
  }

  render() {
    const staticDynamicSelect = this.renderStaticDynamicSelect();

    const stylePropertyForm =
      this.props.disabled && this.props.disabledBy ? (
        <EuiToolTip
          anchorClassName="mapStyleFormDisabledTooltip"
          content={getDisabledByMessage(this.props.disabledBy)}
        >
          <EuiFlexGroup gutterSize="xs">
            <EuiFlexItem grow={false} className="mapStyleSettings__fixedBox">
              {staticDynamicSelect}
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFieldText compressed disabled />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiToolTip>
      ) : (
        <Fragment>
          {React.cloneElement(this.props.children, {
            staticDynamicSelect,
          })}
          {(this.props.styleProperty as IStyleProperty<DynamicOptions>).renderDataMappingPopover(
            this._onDataMappingChange
          )}
        </Fragment>
      );

    return (
      <EuiFormRow
        label={getVectorStyleLabel(this.props.styleProperty.getStyleName())}
        display="rowCompressed"
      >
        {stylePropertyForm}
      </EuiFormRow>
    );
  }
}
