/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { Component, Fragment } from 'react';

import { i18n } from '@kbn/i18n';
import { EuiButtonGroup, EuiFormRow, EuiSpacer, EuiSwitch, EuiSwitchEvent } from '@elastic/eui';
import { VectorStyleColorEditor } from './color/vector_style_color_editor';
import { VectorStyleSizeEditor } from './size/vector_style_size_editor';
// @ts-expect-error
import { VectorStyleSymbolizeAsEditor } from './symbol/vector_style_symbolize_as_editor';
import { VectorStyleIconEditor } from './symbol/vector_style_icon_editor';
import { VectorStyleLabelEditor } from './label/vector_style_label_editor';
// @ts-expect-error
import { VectorStyleLabelBorderSizeEditor } from './label/vector_style_label_border_size_editor';
// @ts-expect-error
import { OrientationEditor } from './orientation/orientation_editor';
import { getDefaultDynamicProperties, getDefaultStaticProperties } from '../vector_style_defaults';
import { DEFAULT_FILL_COLORS, DEFAULT_LINE_COLORS } from '../../color_palettes';

import {
  LABEL_BORDER_SIZES,
  STYLE_TYPE,
  VECTOR_SHAPE_TYPE,
  VECTOR_STYLES,
} from '../../../../../common/constants';
import { createStyleFieldsHelper, StyleField, StyleFieldsHelper } from '../style_fields_helper';
import {
  ColorDynamicOptions,
  ColorStaticOptions,
  CustomIcon,
  DynamicStylePropertyOptions,
  IconDynamicOptions,
  IconStaticOptions,
  LabelDynamicOptions,
  LabelStaticOptions,
  SizeDynamicOptions,
  SizeStaticOptions,
  StaticStylePropertyOptions,
  StylePropertyOptions,
  VectorStylePropertiesDescriptor,
} from '../../../../../common/descriptor_types';
import { IStyleProperty } from '../properties/style_property';
import { SymbolizeAsProperty } from '../properties/symbolize_as_property';
import { LabelBorderSizeProperty } from '../properties/label_border_size_property';
import { StaticTextProperty } from '../properties/static_text_property';
import { DynamicTextProperty } from '../properties/dynamic_text_property';
import { StaticSizeProperty } from '../properties/static_size_property';
import { IVectorLayer } from '../../../layers/vector_layer';
import { getHasLabel } from '../style_util';

export interface StyleProperties {
  [key: string]: IStyleProperty<StylePropertyOptions>;
}

interface Props {
  layer: IVectorLayer;
  isPointsOnly: boolean;
  isLinesOnly: boolean;
  onIsTimeAwareChange: (isTimeAware: boolean) => void;
  onCustomIconsChange: (customIcons: Record<string, CustomIcon>) => void;
  handlePropertyChange: (propertyName: VECTOR_STYLES, stylePropertyDescriptor: unknown) => void;
  hasBorder: boolean;
  styleProperties: StyleProperties;
  isTimeAware: boolean;
  showIsTimeAware: boolean;
  customIcons?: Record<string, CustomIcon>;
}

interface State {
  styleFields: StyleField[];
  defaultDynamicProperties: VectorStylePropertiesDescriptor;
  defaultStaticProperties: VectorStylePropertiesDescriptor;
  supportedFeatures: VECTOR_SHAPE_TYPE[];
  selectedFeature: VECTOR_SHAPE_TYPE;
  styleFieldsHelper?: StyleFieldsHelper;
}

export class VectorStyleEditor extends Component<Props, State> {
  private _isMounted: boolean = false;

  constructor(props: Props) {
    super(props);

    let selectedFeature = VECTOR_SHAPE_TYPE.POLYGON;
    if (props.isPointsOnly) {
      selectedFeature = VECTOR_SHAPE_TYPE.POINT;
    } else if (props.isLinesOnly) {
      selectedFeature = VECTOR_SHAPE_TYPE.LINE;
    }

    this.state = {
      styleFields: [],
      defaultDynamicProperties: getDefaultDynamicProperties(),
      defaultStaticProperties: getDefaultStaticProperties(),
      supportedFeatures: [],
      selectedFeature,
    };
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadFields();
    this._loadSupportedFeatures();
  }

  componentDidUpdate() {
    this._loadFields();
    this._loadSupportedFeatures();
  }

  async _loadFields() {
    const styleFieldsHelper = await createStyleFieldsHelper(
      await this.props.layer.getStyleEditorFields()
    );
    const styleFields = styleFieldsHelper.getStyleFields();
    if (
      !this._isMounted ||
      (_.isEqual(styleFields, this.state.styleFields) && this.state.styleFieldsHelper !== undefined)
    ) {
      return;
    }

    this.setState({
      styleFields,
      styleFieldsHelper,
    });
  }

  async _loadSupportedFeatures() {
    const supportedFeatures = await this.props.layer.getSource().getSupportedShapeTypes();
    if (this._isMounted && !_.isEqual(supportedFeatures, this.state.supportedFeatures)) {
      this.setState({ supportedFeatures });
    }
  }

  _handleSelectedFeatureChange = (selectedFeature: string) => {
    this.setState({ selectedFeature: selectedFeature as VECTOR_SHAPE_TYPE });
  };

  _onIsTimeAwareChange = (event: EuiSwitchEvent) => {
    this.props.onIsTimeAwareChange(event.target.checked);
  };

  _onStaticStyleChange = (propertyName: VECTOR_STYLES, options: StaticStylePropertyOptions) => {
    const styleDescriptor = {
      type: STYLE_TYPE.STATIC,
      options,
    };
    this.props.handlePropertyChange(propertyName, styleDescriptor);
  };

  _onDynamicStyleChange = (propertyName: VECTOR_STYLES, options: DynamicStylePropertyOptions) => {
    const styleDescriptor = {
      type: STYLE_TYPE.DYNAMIC,
      options,
    };
    this.props.handlePropertyChange(propertyName, styleDescriptor);
  };

  _onCustomIconsChange = (icons: Record<string, CustomIcon>) => {
    this.props.onCustomIconsChange(icons);
  };

  _hasMarkerOrIcon() {
    const iconSize = this.props.styleProperties[VECTOR_STYLES.ICON_SIZE];
    return iconSize.isDynamic() || (iconSize as StaticSizeProperty).getOptions().size > 0;
  }

  _hasLabelBorder() {
    const labelBorderSize = this.props.styleProperties[
      VECTOR_STYLES.LABEL_BORDER_SIZE
    ] as LabelBorderSizeProperty;
    return labelBorderSize.getOptions().size !== LABEL_BORDER_SIZES.NONE;
  }

  _renderFillColor(isPointFillColor = false) {
    return (
      <VectorStyleColorEditor
        disabled={isPointFillColor && !this._hasMarkerOrIcon()}
        disabledBy={VECTOR_STYLES.ICON_SIZE}
        swatches={DEFAULT_FILL_COLORS}
        onStaticStyleChange={this._onStaticStyleChange}
        onDynamicStyleChange={this._onDynamicStyleChange}
        styleProperty={
          this.props.styleProperties[VECTOR_STYLES.FILL_COLOR] as IStyleProperty<
            ColorDynamicOptions | ColorStaticOptions
          >
        }
        fields={this.state.styleFieldsHelper!.getFieldsForStyle(VECTOR_STYLES.FILL_COLOR)}
        defaultStaticStyleOptions={
          this.state.defaultStaticProperties[VECTOR_STYLES.FILL_COLOR].options as ColorStaticOptions
        }
        defaultDynamicStyleOptions={
          this.state.defaultDynamicProperties[VECTOR_STYLES.FILL_COLOR]
            .options as ColorDynamicOptions
        }
      />
    );
  }

  _renderLineColor(isPointBorderColor = false) {
    const disabledByIconSize = isPointBorderColor && !this._hasMarkerOrIcon();
    return (
      <VectorStyleColorEditor
        disabled={disabledByIconSize || !this.props.hasBorder}
        disabledBy={disabledByIconSize ? VECTOR_STYLES.ICON_SIZE : VECTOR_STYLES.LINE_WIDTH}
        swatches={DEFAULT_LINE_COLORS}
        onStaticStyleChange={this._onStaticStyleChange}
        onDynamicStyleChange={this._onDynamicStyleChange}
        styleProperty={
          this.props.styleProperties[VECTOR_STYLES.LINE_COLOR] as IStyleProperty<
            ColorDynamicOptions | ColorStaticOptions
          >
        }
        fields={this.state.styleFieldsHelper!.getFieldsForStyle(VECTOR_STYLES.LINE_COLOR)}
        defaultStaticStyleOptions={
          this.state.defaultStaticProperties[VECTOR_STYLES.LINE_COLOR].options as ColorStaticOptions
        }
        defaultDynamicStyleOptions={
          this.state.defaultDynamicProperties[VECTOR_STYLES.LINE_COLOR]
            .options as ColorDynamicOptions
        }
      />
    );
  }

  _renderLineWidth(isPointBorderWidth = false) {
    return (
      <VectorStyleSizeEditor
        disabled={isPointBorderWidth && !this._hasMarkerOrIcon()}
        disabledBy={VECTOR_STYLES.ICON_SIZE}
        onStaticStyleChange={this._onStaticStyleChange}
        onDynamicStyleChange={this._onDynamicStyleChange}
        styleProperty={
          this.props.styleProperties[VECTOR_STYLES.LINE_WIDTH] as IStyleProperty<
            SizeDynamicOptions | SizeStaticOptions
          >
        }
        fields={this.state.styleFieldsHelper!.getFieldsForStyle(VECTOR_STYLES.LINE_WIDTH)}
        defaultStaticStyleOptions={
          this.state.defaultStaticProperties[VECTOR_STYLES.LINE_WIDTH].options as SizeStaticOptions
        }
        defaultDynamicStyleOptions={
          this.state.defaultDynamicProperties[VECTOR_STYLES.LINE_WIDTH]
            .options as SizeDynamicOptions
        }
      />
    );
  }

  _renderLabelProperties() {
    const hasLabel = getHasLabel(
      this.props.styleProperties[VECTOR_STYLES.LABEL_TEXT] as
        | StaticTextProperty
        | DynamicTextProperty
    );
    const hasLabelBorder = this._hasLabelBorder();
    return (
      <Fragment>
        <VectorStyleLabelEditor
          onStaticStyleChange={this._onStaticStyleChange}
          onDynamicStyleChange={this._onDynamicStyleChange}
          styleProperty={
            this.props.styleProperties[VECTOR_STYLES.LABEL_TEXT] as IStyleProperty<
              LabelDynamicOptions | LabelStaticOptions
            >
          }
          fields={this.state.styleFieldsHelper!.getFieldsForStyle(VECTOR_STYLES.LABEL_TEXT)}
          defaultStaticStyleOptions={
            this.state.defaultStaticProperties[VECTOR_STYLES.LABEL_TEXT]
              .options as LabelStaticOptions
          }
          defaultDynamicStyleOptions={
            this.state.defaultDynamicProperties[VECTOR_STYLES.LABEL_TEXT]
              .options as LabelDynamicOptions
          }
        />
        <EuiSpacer size="m" />

        <VectorStyleColorEditor
          disabled={!hasLabel}
          disabledBy={VECTOR_STYLES.LABEL_TEXT}
          swatches={DEFAULT_LINE_COLORS}
          onStaticStyleChange={this._onStaticStyleChange}
          onDynamicStyleChange={this._onDynamicStyleChange}
          styleProperty={
            this.props.styleProperties[VECTOR_STYLES.LABEL_COLOR] as IStyleProperty<
              ColorDynamicOptions | ColorStaticOptions
            >
          }
          fields={this.state.styleFieldsHelper!.getFieldsForStyle(VECTOR_STYLES.LABEL_COLOR)}
          defaultStaticStyleOptions={
            this.state.defaultStaticProperties[VECTOR_STYLES.LABEL_COLOR]
              .options as ColorStaticOptions
          }
          defaultDynamicStyleOptions={
            this.state.defaultDynamicProperties[VECTOR_STYLES.LABEL_COLOR]
              .options as ColorDynamicOptions
          }
        />
        <EuiSpacer size="m" />

        <VectorStyleSizeEditor
          disabled={!hasLabel}
          disabledBy={VECTOR_STYLES.LABEL_TEXT}
          onStaticStyleChange={this._onStaticStyleChange}
          onDynamicStyleChange={this._onDynamicStyleChange}
          styleProperty={
            this.props.styleProperties[VECTOR_STYLES.LABEL_SIZE] as IStyleProperty<
              SizeDynamicOptions | SizeStaticOptions
            >
          }
          fields={this.state.styleFieldsHelper!.getFieldsForStyle(VECTOR_STYLES.LABEL_SIZE)}
          defaultStaticStyleOptions={
            this.state.defaultStaticProperties[VECTOR_STYLES.LABEL_SIZE]
              .options as SizeStaticOptions
          }
          defaultDynamicStyleOptions={
            this.state.defaultDynamicProperties[VECTOR_STYLES.LABEL_SIZE]
              .options as SizeDynamicOptions
          }
        />
        <EuiSpacer size="m" />

        <VectorStyleColorEditor
          disabled={!hasLabel || !hasLabelBorder}
          disabledBy={hasLabel ? VECTOR_STYLES.LABEL_BORDER_SIZE : VECTOR_STYLES.LABEL_TEXT}
          swatches={DEFAULT_LINE_COLORS}
          onStaticStyleChange={this._onStaticStyleChange}
          onDynamicStyleChange={this._onDynamicStyleChange}
          styleProperty={
            this.props.styleProperties[VECTOR_STYLES.LABEL_BORDER_COLOR] as IStyleProperty<
              ColorDynamicOptions | ColorStaticOptions
            >
          }
          fields={this.state.styleFieldsHelper!.getFieldsForStyle(VECTOR_STYLES.LABEL_BORDER_COLOR)}
          defaultStaticStyleOptions={
            this.state.defaultStaticProperties[VECTOR_STYLES.LABEL_BORDER_COLOR]
              .options as ColorStaticOptions
          }
          defaultDynamicStyleOptions={
            this.state.defaultDynamicProperties[VECTOR_STYLES.LABEL_BORDER_COLOR]
              .options as ColorDynamicOptions
          }
        />
        <EuiSpacer size="m" />

        <VectorStyleLabelBorderSizeEditor
          disabled={!hasLabel}
          disabledBy={VECTOR_STYLES.LABEL_TEXT}
          handlePropertyChange={this.props.handlePropertyChange}
          styleProperty={this.props.styleProperties[VECTOR_STYLES.LABEL_BORDER_SIZE]}
        />
        <EuiSpacer size="m" />
      </Fragment>
    );
  }

  _renderPointProperties() {
    const hasMarkerOrIcon = this._hasMarkerOrIcon();
    let iconOrientationEditor;
    let iconEditor;
    if (
      (
        this.props.styleProperties[VECTOR_STYLES.SYMBOLIZE_AS] as SymbolizeAsProperty
      ).isSymbolizedAsIcon()
    ) {
      iconOrientationEditor = (
        <Fragment>
          <OrientationEditor
            disabled={!hasMarkerOrIcon}
            disabledBy={VECTOR_STYLES.ICON_SIZE}
            onStaticStyleChange={this._onStaticStyleChange}
            onDynamicStyleChange={this._onDynamicStyleChange}
            styleProperty={this.props.styleProperties[VECTOR_STYLES.ICON_ORIENTATION]}
            fields={this.state.styleFieldsHelper!.getFieldsForStyle(VECTOR_STYLES.ICON_ORIENTATION)}
            defaultStaticStyleOptions={
              this.state.defaultStaticProperties[VECTOR_STYLES.ICON_ORIENTATION].options
            }
            defaultDynamicStyleOptions={
              this.state.defaultDynamicProperties[VECTOR_STYLES.ICON_ORIENTATION].options
            }
          />
          <EuiSpacer size="m" />
        </Fragment>
      );
      iconEditor = (
        <Fragment>
          <VectorStyleIconEditor
            disabled={!hasMarkerOrIcon}
            disabledBy={VECTOR_STYLES.ICON_SIZE}
            customIcons={this.props.customIcons}
            onStaticStyleChange={this._onStaticStyleChange}
            onDynamicStyleChange={this._onDynamicStyleChange}
            onCustomIconsChange={this._onCustomIconsChange}
            styleProperty={
              this.props.styleProperties[VECTOR_STYLES.ICON] as IStyleProperty<
                IconDynamicOptions | IconStaticOptions
              >
            }
            fields={this.state.styleFieldsHelper!.getFieldsForStyle(VECTOR_STYLES.ICON)}
            defaultStaticStyleOptions={
              this.state.defaultStaticProperties[VECTOR_STYLES.ICON].options as IconStaticOptions
            }
            defaultDynamicStyleOptions={
              this.state.defaultDynamicProperties[VECTOR_STYLES.ICON].options as IconDynamicOptions
            }
          />
          <EuiSpacer size="m" />
        </Fragment>
      );
    }

    return (
      <Fragment>
        <VectorStyleSymbolizeAsEditor
          disabled={!hasMarkerOrIcon}
          disabledBy={VECTOR_STYLES.ICON_SIZE}
          styleProperty={this.props.styleProperties[VECTOR_STYLES.SYMBOLIZE_AS]}
          handlePropertyChange={this.props.handlePropertyChange}
        />
        <EuiSpacer size="m" />

        {iconEditor}

        {this._renderFillColor(true)}
        <EuiSpacer size="m" />

        {this._renderLineColor(true)}
        <EuiSpacer size="m" />

        {this._renderLineWidth(true)}
        <EuiSpacer size="m" />

        {iconOrientationEditor}

        <VectorStyleSizeEditor
          onStaticStyleChange={this._onStaticStyleChange}
          onDynamicStyleChange={this._onDynamicStyleChange}
          styleProperty={
            this.props.styleProperties[VECTOR_STYLES.ICON_SIZE] as IStyleProperty<
              SizeDynamicOptions | SizeStaticOptions
            >
          }
          fields={this.state.styleFieldsHelper!.getFieldsForStyle(VECTOR_STYLES.ICON_SIZE)}
          defaultStaticStyleOptions={
            this.state.defaultStaticProperties[VECTOR_STYLES.ICON_SIZE].options as SizeStaticOptions
          }
          defaultDynamicStyleOptions={
            this.state.defaultDynamicProperties[VECTOR_STYLES.ICON_SIZE]
              .options as SizeDynamicOptions
          }
        />
        <EuiSpacer size="m" />

        {this._renderLabelProperties()}
      </Fragment>
    );
  }

  _renderLineProperties() {
    return (
      <Fragment>
        {this._renderLineColor()}
        <EuiSpacer size="m" />

        {this._renderLineWidth()}
        <EuiSpacer size="m" />

        {this._renderLabelProperties()}
      </Fragment>
    );
  }

  _renderPolygonProperties() {
    return (
      <Fragment>
        {this._renderFillColor()}
        <EuiSpacer size="m" />

        {this._renderLineColor()}
        <EuiSpacer size="m" />

        {this._renderLineWidth()}
        <EuiSpacer size="m" />

        {this._renderLabelProperties()}
      </Fragment>
    );
  }

  _renderProperties() {
    const { supportedFeatures, selectedFeature, styleFieldsHelper } = this.state;

    if (supportedFeatures.length === 0 || !styleFieldsHelper) {
      return null;
    }

    if (supportedFeatures.length === 1) {
      switch (supportedFeatures[0]) {
        case VECTOR_SHAPE_TYPE.POINT:
          return this._renderPointProperties();
        case VECTOR_SHAPE_TYPE.LINE:
          return this._renderLineProperties();
        case VECTOR_SHAPE_TYPE.POLYGON:
          return this._renderPolygonProperties();
      }
    }

    const featureButtons = [
      {
        id: VECTOR_SHAPE_TYPE.POINT,
        label: i18n.translate('xpack.maps.vectorStyleEditor.pointLabel', {
          defaultMessage: 'Points',
        }),
      },
      {
        id: VECTOR_SHAPE_TYPE.LINE,
        label: i18n.translate('xpack.maps.vectorStyleEditor.lineLabel', {
          defaultMessage: 'Lines',
        }),
      },
      {
        id: VECTOR_SHAPE_TYPE.POLYGON,
        label: i18n.translate('xpack.maps.vectorStyleEditor.polygonLabel', {
          defaultMessage: 'Polygons',
        }),
      },
    ];

    let styleProperties = this._renderPolygonProperties();
    if (selectedFeature === VECTOR_SHAPE_TYPE.LINE) {
      styleProperties = this._renderLineProperties();
    } else if (selectedFeature === VECTOR_SHAPE_TYPE.POINT) {
      styleProperties = this._renderPointProperties();
    }

    return (
      <Fragment>
        <EuiButtonGroup
          legend={i18n.translate('xpack.maps.vectorStyleEditor.featureTypeButtonGroupLegend', {
            defaultMessage: 'vector feature button group',
          })}
          options={featureButtons}
          idSelected={selectedFeature}
          onChange={this._handleSelectedFeatureChange}
        />

        <EuiSpacer size="m" />

        {styleProperties}
      </Fragment>
    );
  }

  _renderIsTimeAwareSwitch() {
    if (!this.props.showIsTimeAware) {
      return null;
    }

    return (
      <EuiFormRow display="columnCompressedSwitch">
        <EuiSwitch
          label={i18n.translate('xpack.maps.vectorStyleEditor.isTimeAwareLabel', {
            defaultMessage: 'Apply global time to style metadata requests',
          })}
          checked={this.props.isTimeAware}
          onChange={this._onIsTimeAwareChange}
          compressed
        />
      </EuiFormRow>
    );
  }

  render() {
    return (
      <Fragment>
        {this._renderProperties()}
        {this._renderIsTimeAwareSwitch()}
      </Fragment>
    );
  }
}
