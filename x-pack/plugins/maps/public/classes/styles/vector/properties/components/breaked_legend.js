/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import _ from 'lodash';
import { Category } from '../../components/legend/category';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTextColor, EuiToolTip } from '@elastic/eui';
import { getOtherCategoryLabel } from '../../style_util';
const EMPTY_VALUE = '';

export class BreakedLegend extends React.Component {
  state = {
    label: EMPTY_VALUE,
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadParams();
  }

  componentDidUpdate() {
    this._loadParams();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _loadParams() {
    const label = await this.props.style.getField().getLabel();
    const newState = { label };
    if (this._isMounted && !_.isEqual(this.state, newState)) {
      this.setState(newState);
    }
  }

  render() {
    if (this.state.label === EMPTY_VALUE) {
      return null;
    }

    const categories = [];

    this.props.stops.map(({ stop, color, style }) => {
      const smblId = style ? style : this.props.symbolId;
      const clr = color ? color : this.props.color;
      //assume key will never equal `__fallbackCategory__`
      categories.push(
        <EuiFlexItem key={stop}>
          <Category
            styleName={this.props.style.getStyleName()}
            label={this.props.style.formatField(stop)}
            color={clr}
            isLinesOnly={this.props.isLinesOnly}
            isPointsOnly={this.props.isPointsOnly}
            symbolId={smblId}
          />
        </EuiFlexItem>
      );
    });

    if (this.props.useFallback) {
      const color = this.props.fallbackColor ? this.props.fallbackColor : this.props.color;
      const symbolId = this.props.fallbackSymbolId
        ? this.props.fallbackSymbolId
        : this.props.symbolId;

      categories.push(
        <EuiFlexItem key="__fallbackCategory__">
          <Category
            styleName={this.props.style.getStyleName()}
            label={<EuiTextColor color="secondary">{getOtherCategoryLabel()}</EuiTextColor>}
            color={color}
            isLinesOnly={this.props.isLinesOnly}
            isPointsOnly={this.props.isPointsOnly}
            symbolId={symbolId}
          />
        </EuiFlexItem>
      );
    }

    return (
      <div>
        <EuiFlexGroup gutterSize="xs" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiToolTip
              position="top"
              title={this.props.style.getDisplayStyleName()}
              content={this.state.label}
            >
              <EuiText className="eui-textTruncate" size="xs" style={{ maxWidth: '180px' }}>
                <small>
                  <strong>{this.state.label}</strong>
                </small>
              </EuiText>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup direction="column" gutterSize="none">
          {categories}
        </EuiFlexGroup>
      </div>
    );
  }
}
