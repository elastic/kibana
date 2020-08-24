/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import _ from 'lodash';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import { RangedStyleLegendRow } from '../../../components/ranged_style_legend_row';
import { VECTOR_STYLES } from '../../../../../../common/constants';
import { CircleIcon } from './circle_icon';
import { IDynamicStyleProperty } from '../../properties/dynamic_style_property';

function getLineWidthIcons() {
  const defaultStyle = {
    stroke: 'grey',
    fill: 'none',
    width: '12px',
  };
  return [
    <CircleIcon style={{ ...defaultStyle, strokeWidth: '1px' }} />,
    <CircleIcon style={{ ...defaultStyle, strokeWidth: '2px' }} />,
    <CircleIcon style={{ ...defaultStyle, strokeWidth: '3px' }} />,
  ];
}

function getSymbolSizeIcons() {
  const defaultStyle = {
    stroke: 'grey',
    fill: 'grey',
  };
  return [
    <CircleIcon style={{ ...defaultStyle, width: '4px' }} />,
    <CircleIcon style={{ ...defaultStyle, width: '8px' }} />,
    <CircleIcon style={{ ...defaultStyle, width: '12px' }} />,
  ];
}
const EMPTY_VALUE = '';

interface Props {
  style: IDynamicStyleProperty<any>;
}

interface State {
  label: string;
}

export class OrdinalLegend extends Component<Props, State> {
  private _isMounted: boolean = false;

  state: State = {
    label: EMPTY_VALUE,
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadLabel();
  }

  componentDidUpdate() {
    this._loadLabel();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _loadLabel() {
    const field = this.props.style.getField();
    if (!field) {
      return;
    }
    const label = await field.getLabel();
    if (this._isMounted && !_.isEqual(this.state.label, label)) {
      this.setState({ label });
    }
  }

  _formatValue(value: string | number) {
    if (value === EMPTY_VALUE) {
      return value;
    }
    return this.props.style.formatField(value);
  }

  _renderRangeLegendHeader() {
    let icons;
    if (this.props.style.getStyleName() === VECTOR_STYLES.LINE_WIDTH) {
      icons = getLineWidthIcons();
    } else if (this.props.style.getStyleName() === VECTOR_STYLES.ICON_SIZE) {
      icons = getSymbolSizeIcons();
    } else {
      return null;
    }

    return (
      <EuiFlexGroup gutterSize="xs" justifyContent="spaceBetween" alignItems="center">
        {icons.map((icon, index) => {
          const isLast = index === icons.length - 1;
          let spacer;
          if (!isLast) {
            spacer = (
              <EuiFlexItem>
                <EuiHorizontalRule margin="xs" />
              </EuiFlexItem>
            );
          }
          return (
            <Fragment key={index}>
              <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
              {spacer}
            </Fragment>
          );
        })}
      </EuiFlexGroup>
    );
  }

  render() {
    const header = this._renderRangeLegendHeader();
    if (!header) {
      return null;
    }

    const fieldMeta = this.props.style.getRangeFieldMeta();

    let minLabel: string | number = EMPTY_VALUE;
    let maxLabel: string | number = EMPTY_VALUE;
    if (fieldMeta) {
      const min = this._formatValue(_.get(fieldMeta, 'min', EMPTY_VALUE));
      minLabel =
        this.props.style.isFieldMetaEnabled() && fieldMeta.isMinOutsideStdRange ? `< ${min}` : min;

      const max = this._formatValue(_.get(fieldMeta, 'max', EMPTY_VALUE));
      maxLabel =
        this.props.style.isFieldMetaEnabled() && fieldMeta.isMaxOutsideStdRange ? `> ${max}` : max;
    }

    return (
      <RangedStyleLegendRow
        header={header}
        minLabel={minLabel}
        maxLabel={maxLabel}
        propertyLabel={this.props.style.getDisplayStyleName()}
        fieldLabel={this.state.label}
      />
    );
  }
}
