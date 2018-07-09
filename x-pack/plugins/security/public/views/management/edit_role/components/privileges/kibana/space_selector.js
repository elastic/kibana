/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  EuiComboBox,
} from '@elastic/eui';


const spaceToOption = (s) => ({ id: s.id, label: s.name });

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
    return (
      <EuiComboBox
        placeholder={`choose space(s)`}
        options={this.props.spaces.map(spaceToOption)}
        selectedOptions={this.props.selectedSpaceIds.map(spaceIdToOption(this.props.spaces))}
        disabled={this.props.disabled}
        onChange={this.onChange}
      />
    );
  }

  onChange = (selectedSpaces) => {
    console.log(selectedSpaces);
    this.props.onChange(selectedSpaces.map(s => s.id));
  }
}
