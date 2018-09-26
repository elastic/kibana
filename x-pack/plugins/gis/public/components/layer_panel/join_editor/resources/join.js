/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, {  } from 'react';

import {
  EuiSuperSelect,
  EuiFlexItem,
  EuiFlexGroup
} from '@elastic/eui';

export class Join extends React.Component {

  constructor() {
    super();
    this.state = {
      stringFields: null,
      leftField: null,
      rightTable: null
    };
  }

  async _loadStringFields() {


    if (this.state.stringFields) {
      return;
    }

    const stringFields = await this.props.layer.getStringFields();

    this.setState({
      stringFields: stringFields
    });

  }

  _renderJoinFields() {

    if (!this.state.stringFields) {
      return null;
    }

    if (!this.state.stringFields.length) {
      return null;
    }

    const options = this.state.stringFields.map(field => {
      return {
        value: field.name,
        inputDisplay: field.name,
        dropdownDisplay: field.name + ': ' + field.label
      };
    });

    const onChange = (field) => {
      this.setState({
        leftField: field
      });
    };

    const selectedValue = this.state.leftField ? this.state.leftField : this.state.stringFields[0].name;
    return (
      <EuiSuperSelect valueOfSelected={selectedValue} options={options}  onChange={onChange} />
    );
  }

  render() {
    this._loadStringFields();
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          {this._renderJoinFields()}
        </EuiFlexItem>
        <EuiFlexItem>
          here be data selector
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
