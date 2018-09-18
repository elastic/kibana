/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiButton,
} from '@elastic/eui';

import {
  SearchSelect,
} from 'ui/search_select';

export class FieldChooser extends Component {
  static propTypes = {
    buttonLabel: PropTypes.node.isRequired,
    columns: PropTypes.array.isRequired,
    fields: PropTypes.array.isRequired,
    onSelectField: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);

    this.state = {
      isOpen: false,
    };
  }

  onButtonClick = () => {
    this.setState(state => ({
      isOpen: !state.isOpen,
    }));
  };

  close = () => {
    this.setState({
      isOpen: false,
    });
  };

  onSelect = (field) => {
    this.props.onSelectField(field);
  }

  render() {
    const {
      buttonLabel,
      columns,
      fields,
    } = this.props;

    const { isOpen } = this.state;

    const button = (
      <EuiButton
        iconType="arrowDown"
        iconSide="right"
        onClick={this.onButtonClick}
      >
        {buttonLabel}
      </EuiButton>
    );

    return (
      <SearchSelect
        button={button}
        columns={columns}
        items={fields}
        isOpen={isOpen}
        close={this.close}
        onSelectItem={this.onSelect}
        searchField="name"
        prompt="Search fields"
        anchorPosition="downRight"
      />
    );
  }
}
