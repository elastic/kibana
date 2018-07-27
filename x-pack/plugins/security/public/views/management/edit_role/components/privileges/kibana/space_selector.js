/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  EuiComboBox,
  EuiHealth,
  EuiHighlight,
} from '@elastic/eui';
import { getSpaceColor } from '../../../../../../../../spaces/common/space_attributes';

const spaceToOption = (s) => ({ id: s.id, label: s.name, color: getSpaceColor(s) });

const spaceIdToOption = (spaces) => (s) => spaceToOption(spaces.find(space => space.id === s));

export class SpaceSelector extends Component {
  static propTypes = {
    spaces: PropTypes.array.isRequired,
    selectedSpaceIds: PropTypes.array.isRequired,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
  }

  state = {
    isPopoverOpen: false,
  }

  render() {
    const renderOption = (option, searchValue, contentClassName) => {
      const { color, label } = option;
      return (
        <EuiHealth color={color}>
          <span className={contentClassName}>
            <EuiHighlight search={searchValue}>
              {label}
            </EuiHighlight>
          </span>
        </EuiHealth>
      );
    };

    return (
      <EuiComboBox
        placeholder={`choose space(s)`}
        options={this.props.spaces.map(spaceToOption)}
        renderOption={renderOption}
        selectedOptions={this.props.selectedSpaceIds.map(spaceIdToOption(this.props.spaces))}
        disabled={this.props.disabled}
        onChange={this.onChange}
      />
    );
  }

  onChange = (selectedSpaces) => {
    this.props.onChange(selectedSpaces.map(s => s.id));
  }
}
