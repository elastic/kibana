/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiComboBox,
  EuiComboBoxOptionProps,
  EuiHealth,
  // @ts-ignore
  EuiHighlight,
} from '@elastic/eui';
import React, { Component } from 'react';
import { Space } from '../../../../../../../../spaces/common/model/space';
import { getSpaceColor } from '../../../../../../../../spaces/common/space_attributes';

const spaceToOption = (space?: Space) => {
  if (!space) {
    return { label: '', isGroupLabelOption: false };
  }

  return {
    id: space.id,
    label: space.name,
    color: getSpaceColor(space),
    isGroupLabelOption: false,
  };
};

const spaceIdToOption = (spaces: Space[]) => (s: string) =>
  spaceToOption(spaces.find(space => space.id === s));

interface Props {
  spaces: Space[];
  selectedSpaceIds: string[];
  onChange: (spaceIds: string[]) => void;
  disabled?: boolean;
}

export class SpaceSelector extends Component<Props, {}> {
  public render() {
    const renderOption = (option: any, searchValue: string, contentClassName: string) => {
      const { color, label } = option;
      return (
        <EuiHealth color={color}>
          <span className={contentClassName}>
            <EuiHighlight search={searchValue}>{label}</EuiHighlight>
          </span>
        </EuiHealth>
      );
    };

    return (
      <EuiComboBox
        options={this.props.spaces.map(spaceToOption)}
        renderOption={renderOption}
        selectedOptions={this.props.selectedSpaceIds.map(spaceIdToOption(this.props.spaces))}
        isDisabled={this.props.disabled}
        onChange={this.onChange}
      />
    );
  }

  public onChange = (selectedSpaces: EuiComboBoxOptionProps[]) => {
    this.props.onChange(selectedSpaces.map(s => s.id as string));
  };
}
