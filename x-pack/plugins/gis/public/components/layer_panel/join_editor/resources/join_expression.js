/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiPopover,
  EuiPopoverTitle,
  EuiExpression,
  EuiFormRow,
} from '@elastic/eui';

import { IndexPatternSelect } from 'ui/index_patterns/components/index_pattern_select';

import {
  indexPatternService,
} from '../../../../kibana_services';

export class JoinExpression extends Component {

  state = {
    isPopoverOpen: false,
  };

  _togglePopover = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  _closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  _onChange = async (indexPatternId) => {
    this.setState({ isPopoverOpen: false });
    try {
      const indexPattern = await indexPatternService.get(indexPatternId);
      this.props.onChange({
        indexPatternId,
        indexPatternTitle: indexPattern.title,
      });
    } catch (err) {
      // do not call onChange with when unable to get indexPatternId
    }
  }

  render() {
    const {
      indexPatternId,
      rightSourceName
    } = this.props;
    return (
      <EuiPopover
        id="joinPopover"
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        ownFocus
        initialFocus="body" /* avoid initialFocus on Combobox */
        withTitle
        button={
          <EuiExpression
            onClick={this._togglePopover}
            description="JOIN"
            value={rightSourceName ? `${rightSourceName} right` : '-- select --'}
          />
        }
      >
        <div style={{ width: 300 }}>
          <EuiPopoverTitle>JOIN</EuiPopoverTitle>
          <EuiFormRow
            label="Index pattern"
            helpText={`Select right source`}
          >
            <IndexPatternSelect
              placeholder="Select index pattern"
              indexPatternId={indexPatternId}
              onChange={this._onChange}
              isClearable={false}
            />
          </EuiFormRow>
        </div>
      </EuiPopover>
    );
  }
}

JoinExpression.propTypes = {
  indexPatternId: PropTypes.string,
  rightSourceName: PropTypes.string,
};
