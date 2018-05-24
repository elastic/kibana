/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiText,
} from '@elastic/eui';

export class SpacesContextMenu extends Component {
  static propTypes = {
    spaces: PropTypes.array.isRequired,
    onSelectSpace: PropTypes.func.isRequired,
    showManageButton: PropTypes.bool
  }

  render() {
    const items = this.props.spaces.map(this.buildSpaceMenuOption);

    return (
      <EuiFlexGroup direction={'column'} className="spaceSelectorMenu">
        <EuiFlexItem grow={false} className="spaceSelectorMenu__title"><EuiText><h4>Select a Space</h4></EuiText></EuiFlexItem>
        <EuiFlexItem><EuiContextMenuPanel watchedItemProps={['data-id']} className="spaceSelectorMenu__panel" items={items} /></EuiFlexItem>
        {this.buildManageButton()}
      </EuiFlexGroup>
    );
  }

  buildSpaceMenuOption = (space) => {
    return (
      <EuiContextMenuItem
        key={space.id}
        data-id={space.id}
        onClick={this.onSpaceClick(space)}
        toolTipTitle={`Switch to ${space.name}`}
        toolTipContent={space.description}
      >
        {space.name}
      </EuiContextMenuItem>
    );
  }

  buildManageButton = () => {
    if (!this.props.showManageButton) {
      return null;
    }
    return (
      <EuiFlexItem grow={false}>
        <EuiButton className={'spaceSelectorMenu__manageSpacesButton'} onClick={() => { }} size={'s'}>Manage Spaces</EuiButton>
      </EuiFlexItem>
    );
  }

  onSpaceClick = (space) => this.props.onSelectSpace.bind(this, space)
}
