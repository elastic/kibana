/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import _ from 'lodash';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { Category } from './category';
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

    const categories = this.props.breaks.map((brk, index) => {
      return (
        <EuiFlexItem key={index}>
          <Category
            styleName={this.props.style.getStyleName()}
            label={brk.label}
            color={brk.color}
            isLinesOnly={this.props.isLinesOnly}
            isPointsOnly={this.props.isPointsOnly}
            symbolId={brk.symbolId}
          />
        </EuiFlexItem>
      );
    });

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
