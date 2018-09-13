/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiButton,
  EuiPopover,
  EuiBasicTable,
  EuiFieldSearch,
  EuiSpacer,
} from '@elastic/eui';

import './field_chooser.less';

export class FieldChooser extends Component {
  static propTypes = {
    columns: PropTypes.array.isRequired,
    label: PropTypes.node.isRequired,
    fields: PropTypes.array.isRequired,
    onSelectField: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);

    this.state = {
      searchValue: '',
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

  onSearch = (e) => {
    this.setState({
      searchValue: e.target.value,
    });
  };

  render() {
    const {
      columns,
      label,
      fields,
      onSelectField,
    } = this.props;

    const {
      searchValue,
    } = this.state;

    const getRowProps = (field) => {
      return {
        className: 'rollupFieldChooserTableRow',
        onClick: () => {
          onSelectField(field);
          this.close();
        },
      };
    };

    const button = (
      <EuiButton
        iconType="arrowDown"
        iconSide="right"
        onClick={this.onButtonClick}
      >
        {label}
      </EuiButton>
    );

    const items = searchValue ? fields.filter(({ name }) => (
      name.toLowerCase().includes(searchValue.trim().toLowerCase())
    )) : fields;

    return (
      <EuiPopover
        ownFocus
        button={button}
        isOpen={this.state.isOpen}
        closePopover={this.close}
        anchorPosition="rightDown"
      >
        <EuiFieldSearch
          placeholder="Search fields"
          value={searchValue}
          onChange={this.onSearch}
          aria-label="Search fields"
          fullWidth
        />

        <EuiSpacer size="s" />

        <div className="rollupFieldChooserContainer">
          <EuiBasicTable
            items={items}
            columns={columns}
            rowProps={getRowProps}
            responsive={false}
          />
        </div>
      </EuiPopover>
    );
  }
}
