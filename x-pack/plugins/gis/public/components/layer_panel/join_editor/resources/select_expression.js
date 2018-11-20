/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';

import {
  EuiPopover,
  EuiPopoverTitle,
  EuiExpressionButton,
  EuiFormErrorText,
  EuiFormRow,
} from '@elastic/eui';

export class SelectExpression extends Component {

  state = {
    isPopoverOpen: false,
  };

  _togglePopover = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  }

  _closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  }

  _renderAggSelect = () => {
    return (<div>agg select goes here</div>);
  }

  _renderSelectForm = () => {
    if (!this.props.rightFields) {
      return (
        <EuiFormErrorText>JOIN must be set</EuiFormErrorText>
      );
    }

    return (
      <Fragment>
        <EuiFormRow
          label="Aggregation"
        >
          {this._renderAggSelect()}
        </EuiFormRow>
      </Fragment>
    );
  }

  render() {
    return (
      <EuiPopover
        id="selectPopover"
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        ownFocus
        withTitle
        button={
          <EuiExpressionButton
            onClick={() => {}}
            description="SELECT"
            buttonValue={'COUNT(*)'}
          />
        }
      >
        <div style={{ width: 300 }}>
          <EuiPopoverTitle>SELECT</EuiPopoverTitle>
          {this._renderSelectForm()}
        </div>
      </EuiPopover>
    );
  }
}

SelectExpression.propTypes = {
  rightFields: PropTypes.object,  // indexPattern.fields IndexedArray object
};
