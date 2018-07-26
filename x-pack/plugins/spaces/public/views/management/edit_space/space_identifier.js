/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiFormRow,
  EuiLink,
  EuiFieldText,
} from '@elastic/eui';

export class SpaceIdentifier extends Component {
  textFieldRef = null;

  state = {
    editing: false
  };

  render() {
    const {
      id = ''
    } = this.props.space;

    return (
      <Fragment>
        <EuiFormRow
          label={this.getLabel()}
          helpText={this.getHelpText()}
          {...this.props.validator.validateSpaceIdentifier(this.props.space)}
        >
          <EuiFieldText
            readOnly={!this.state.editing}
            placeholder={this.state.editing || !this.props.editable ? null : 'give your space a name to see its identifier'}
            value={id}
            onChange={this.onChange}
            inputRef={(ref) => this.textFieldRef = ref}
          />
        </EuiFormRow>
      </Fragment>
    );
  }

  getLabel = () => {
    if (!this.props.editable) {
      return (<p>Space Identifier</p>);
    }

    const editLinkText = this.state.editing ? `[stop editing]` : `[edit]`;
    return (<p>Space Identifier <EuiLink onClick={this.onEditClick}>{editLinkText}</EuiLink></p>);
  };

  getHelpText = () => {
    return (<p>Links within Kibana will include this space identifier</p>);
  };

  onEditClick = () => {
    this.setState({
      editing: !this.state.editing
    }, () => {
      if (this.textFieldRef && this.state.editing) {
        this.textFieldRef.focus();
      }
    });
  };

  onChange = (e) => {
    if (!this.state.editing) return;
    this.props.onChange(e);
  };
}

SpaceIdentifier.propTypes = {
  space: PropTypes.object.isRequired,
  editable: PropTypes.bool.isRequired,
  onChange: PropTypes.func,
  validator: PropTypes.object.isRequired,
};
