/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Map as MbMap } from '@kbn/mapbox-gl';
import { AbstractStyleProperty } from './style_property';
import { LABEL_POSITIONS } from '../../../../../common/constants';
import { LabelPositionStylePropertyDescriptor } from '../../../../../common/descriptor_types';
import { FIELD_ORIGIN, VECTOR_STYLES } from '../../../../../common/constants';
import { DEFAULT_ICON_SIZE, DEFAULT_LABEL_SIZE } from '../vector_style_defaults';
import { DynamicIconProperty } from './dynamic_icon_property';
import { StaticIconProperty } from './static_icon_property';
import { DynamicSizeProperty } from './dynamic_size_property';
import { StaticSizeProperty } from './static_size_property';
import { getVectorStyleLabel } from '../components/get_vector_style_label';
import { FIXED_LABEL, BY_VALUE_LABEL } from '../components/style_prop_editor';

export class LabelPositionProperty extends AbstractStyleProperty<
  LabelPositionStylePropertyDescriptor['options']
> {
  private readonly _iconProperty: StaticIconProperty | DynamicIconProperty;
  private readonly _iconSizeProperty: StaticSizeProperty | DynamicSizeProperty;
  private readonly _labelSizeProperty: StaticSizeProperty | DynamicSizeProperty;
  private readonly _isSymbolizedAsIcon: boolean;

  constructor(
    options: LabelPositionStylePropertyDescriptor['options'],
    styleName: VECTOR_STYLES,
    iconProperty: StaticIconProperty | DynamicIconProperty,
    iconSizeProperty: StaticSizeProperty | DynamicSizeProperty,
    labelSizeProperty: StaticSizeProperty | DynamicSizeProperty,
    isSymbolizedAsIcon: boolean
  ) {
    super(options, styleName);
    this._iconProperty = iconProperty;
    this._iconSizeProperty = iconSizeProperty;
    this._labelSizeProperty = labelSizeProperty;
    this._isSymbolizedAsIcon = isSymbolizedAsIcon;
  }

  isDisabled() {
    if (this._labelSizeProperty.isDynamic()) {
      // dynamic label size not supported
      return true;
    }

    if (!this._iconSizeProperty.isDynamic() || !this._iconSizeProperty.isComplete()) {
      // icon size is static so there are no concerns with using layout propery and feature-state
      return false;
    }

    // Label position can not be used in concunction with dynamic icon size from joins.
    // Why?
    //   Label position sets layout properties. Layout properties do not support feature-state.
    //   Label position sets a layout property to the interpolate expression from dynamic icon size property
    //   This means that style data for dynamic icon size property can only be retrieved from feature.properties
    //
    return this._isIconSizeFromJoin();
  }

  getDisabledReason() {
    if (this._labelSizeProperty.isDynamic()) {
      return i18n.translate('xpack.maps.labelPosition.dynamicLabelSizeNotSupported', {
        defaultMessage: `{labelPositionPropertyLabel} is not supported with ''{byValueLabel}'' {labelSizePropertyLabel}. Set {labelSizePropertyLabel} to ''{fixedLabel}'' to enable.`,
        values: {
          byValueLabel: BY_VALUE_LABEL.toLowerCase(),
          fixedLabel: FIXED_LABEL.toLowerCase(),
          labelSizePropertyLabel: getVectorStyleLabel(VECTOR_STYLES.LABEL_SIZE).toLowerCase(),
          labelPositionPropertyLabel: getVectorStyleLabel(VECTOR_STYLES.LABEL_POSITION),
        },
      });
    }

    return this._isIconSizeFromJoin()
      ? i18n.translate('xpack.maps.labelPosition.iconSizeJoinFieldNotSupportMsg', {
          defaultMessage:
            '{labelPositionPropertyLabel} is not supported with {iconSizePropertyLabel} join field {iconSizeFieldName}. Set {iconSizePropertyLabel} to source field to enable.',
          values: {
            iconSizePropertyLabel: getVectorStyleLabel(VECTOR_STYLES.ICON_SIZE),
            iconSizeFieldName: (this._iconSizeProperty as DynamicSizeProperty).getFieldName(),
            labelPositionPropertyLabel: getVectorStyleLabel(VECTOR_STYLES.LABEL_POSITION),
          },
        })
      : '';
  }

  syncLabelPositionWithMb(mbLayerId: string, mbMap: MbMap) {
    if (this._options.position === LABEL_POSITIONS.CENTER || this.isDisabled()) {
      mbMap.setLayoutProperty(mbLayerId, 'text-offset', [0, 0]);
      mbMap.setLayoutProperty(mbLayerId, 'text-anchor', 'center');
      return;
    }

    mbMap.setLayoutProperty(
      mbLayerId,
      'text-anchor',
      this._options.position === LABEL_POSITIONS.BOTTOM ? 'top' : 'bottom'
    );

    const labelSize = this._getLabelSize();

    if (
      this._iconSizeProperty.isDynamic() &&
      this._iconSizeProperty.isComplete() &&
      (this._iconSizeProperty as DynamicSizeProperty).isSizeDynamicConfigComplete()
    ) {
      const dynamicIconSizeOptions = (this._iconSizeProperty as DynamicSizeProperty).getOptions();
      const interpolateExpression = (
        this._iconSizeProperty as DynamicSizeProperty
      ).getMbSizeExpression({
        forceFeatureProperties: true,
        maxStopOutput: ['literal', this._getTextOffset(dynamicIconSizeOptions.maxSize, labelSize)],
        minStopOutput: ['literal', this._getTextOffset(dynamicIconSizeOptions.minSize, labelSize)],
      });
      mbMap.setLayoutProperty(mbLayerId, 'text-offset', interpolateExpression);
      return;
    }

    const iconSize = !this._iconSizeProperty.isDynamic()
      ? (this._iconSizeProperty as StaticSizeProperty).getOptions().size
      : DEFAULT_ICON_SIZE;
    mbMap.setLayoutProperty(mbLayerId, 'text-offset', this._getTextOffset(iconSize, labelSize));
  }

  // https://maplibre.org/maplibre-gl-js-docs/style-spec/layers/#layout-symbol-text-offset
  _getTextOffset(symbolSize: number, labelSize: number) {
    const ems = symbolSize / labelSize;
    // Positive values indicate right and down, while negative values indicate left and up
    const verticalTextOffset = this._options.position === LABEL_POSITIONS.BOTTOM ? ems : ems * -1;
    return [0, verticalTextOffset * this._getIconScale()];
  }

  _getIconScale() {
    if (!this._isSymbolizedAsIcon) {
      return 1;
    }

    const iconAnchor = !this._iconProperty.isDynamic()
      ? (this._iconProperty as StaticIconProperty).getSymbolAnchor()
      : 'center';

    if (iconAnchor === 'center') {
      return 1;
    }

    // using scaling factor of 1.75
    // scaling factor of 1.5 is too small - labels touch top of icon
    // scaling factor of 2 is too big - labels are too far above icon
    return this._options.position === LABEL_POSITIONS.TOP ? 1.75 : 0;
  }

  _getLabelSize() {
    return !this._labelSizeProperty.isDynamic()
      ? (this._labelSizeProperty as StaticSizeProperty).getOptions().size
      : DEFAULT_LABEL_SIZE;
  }

  _isIconSizeFromJoin() {
    return (
      this._iconSizeProperty.isDynamic() &&
      (this._iconSizeProperty as DynamicSizeProperty).getFieldOrigin() === FIELD_ORIGIN.JOIN
    );
  }
}
