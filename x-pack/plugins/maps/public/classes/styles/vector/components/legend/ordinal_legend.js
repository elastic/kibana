/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import _ from 'lodash';
import { RangedStyleLegendRow } from '../../../components/ranged_style_legend_row';
import { VECTOR_STYLES } from '../../../../../../common/constants';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import { CircleIcon } from './circle_icon';

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

export class OrdinalLegend extends React.Component {
  constructor() {
    super();
    this._isMounted = false;
    this.state = {
      label: EMPTY_VALUE,
    };
  }

  async _loadParams() {
    const label = await this.props.style.getField().getLabel();
    const newState = { label };
    if (this._isMounted && !_.isEqual(this.state, newState)) {
      this.setState(newState);
    }
  }

  _formatValue(value) {
    if (value === EMPTY_VALUE) {
      return value;
    }
    return this.props.style.formatField(value);
  }

  componentDidUpdate() {
    this._loadParams();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadParams();
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

    let minLabel = EMPTY_VALUE;
    let maxLabel = EMPTY_VALUE;
    if (fieldMeta) {
      const range = { min: fieldMeta.min, max: fieldMeta.max };
      const min = this._formatValue(_.get(range, 'min', EMPTY_VALUE));
      minLabel =
        this.props.style.isFieldMetaEnabled() && range && range.isMinOutsideStdRange
          ? `< ${min}`
          : min;

      const max = this._formatValue(_.get(range, 'max', EMPTY_VALUE));
      maxLabel =
        this.props.style.isFieldMetaEnabled() && range && range.isMaxOutsideStdRange
          ? `> ${max}`
          : max;
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
