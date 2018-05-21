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
  EuiCallOut,
  EuiSpacer
} from '@elastic/eui';

export class UrlContext extends Component {
  textFieldRef = null;

  state = {
    editing: false
  };

  render() {
    const {
      urlContext = ''
    } = this.props.space;

    return (
      <Fragment>
        <EuiFormRow
          label={this.getLabel()}
          helpText={this.getHelpText()}
        >
          <div>
            <EuiFieldText
              readOnly={!this.state.editing}
              placeholder={this.state.editing || !this.props.editable ? null : 'give your space a name to see its URL Context'}
              value={urlContext}
              onChange={this.onChange}
              inputRef={(ref) => this.textFieldRef = ref}
            />
            {this.getCallOut()}
          </div>
        </EuiFormRow>
      </Fragment>
    );
  }

  getLabel = () => {
    if (!this.props.editable) {
      return (<p>URL Context</p>);
    }

    const editLinkText = this.state.editing ? `[stop editing]` : `[edit]`;
    return (<p>URL Context <EuiLink onClick={this.onEditClick}>{editLinkText}</EuiLink></p>);
  };

  getHelpText = () => {
    return (<p>Links within Kibana will include this space identifier</p>);
  };

  getCallOut = () => {
    if (this.props.editingExistingSpace && this.state.editing) {
      return (
        <Fragment>
          <EuiSpacer />
          <EuiCallOut
            color={'warning'}
            size={'s'}
            title={'Changing the URL Context will invalidate all existing links and bookmarks to this space'}
          />
        </Fragment>
      );
    }

    return null;
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

UrlContext.propTypes = {
  space: PropTypes.object.isRequired,
  editable: PropTypes.bool.isRequired,
  editingExistingSpace: PropTypes.bool.isRequired,
  onChange: PropTypes.func
};
