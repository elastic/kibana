/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiAvatar, EuiPopover } from '@elastic/eui';
import React, { Component } from 'react';
import { Space } from '../../../common/model/space';
import { SpaceAvatar } from '../../components';
import { SpacesManager } from '../../lib/spaces_manager';
import { SpacesDescription } from './components/spaces_description';
import { SpacesMenu } from './components/spaces_menu';

interface Props {
  spacesManager: SpacesManager;
  activeSpace: {
    valid: boolean;
    error: string;
    space: Space;
  };
}

interface State {
  isOpen: boolean;
  loading: boolean;
  activeSpaceExists: boolean;
  spaces: Space[];
}

export class NavControlPopover extends Component<Props, State> {
  public state = {
    isOpen: false,
    loading: false,
    activeSpaceExists: true,
    spaces: [],
  };

  public componentDidMount() {
    this.loadSpaces();

    if (this.props.spacesManager) {
      this.props.spacesManager.on('request_refresh', () => {
        this.loadSpaces();
      });
    }
  }

  public render() {
    const button = this.getActiveSpaceButton();
    if (!button) {
      return null;
    }

    let element: React.ReactNode;
    if (this.state.spaces.length < 2) {
      element = <SpacesDescription />;
    } else {
      element = <SpacesMenu spaces={this.state.spaces} onSelectSpace={this.onSelectSpace} />;
    }

    return (
      <EuiPopover
        id={'spacesMenuPopover'}
        button={button}
        isOpen={this.state.isOpen}
        closePopover={this.closePortal}
        anchorPosition={'rightCenter'}
        panelPaddingSize="none"
        ownFocus
      >
        {element}
      </EuiPopover>
    );
  }

  private async loadSpaces() {
    const { spacesManager, activeSpace } = this.props;

    this.setState({
      loading: true,
    });

    const spaces = await spacesManager.getSpaces();

    let activeSpaceExists = this.state.activeSpaceExists;
    if (activeSpace.valid) {
      activeSpaceExists = !!spaces.find(space => space.id === this.props.activeSpace.space.id);
    }

    this.setState({
      spaces,
      activeSpaceExists,
      isOpen: this.state.isOpen || !activeSpaceExists,
      loading: false,
    });
  }

  private getActiveSpaceButton = () => {
    const { activeSpace } = this.props;

    if (!activeSpace) {
      return null;
    }

    if (activeSpace.valid && activeSpace.space) {
      return this.getButton(
        <SpaceAvatar space={activeSpace.space} size={'s'} className={'spaceNavGraphic'} />,
        activeSpace.space.name
      );
    } else if (activeSpace.error) {
      return this.getButton(
        <EuiAvatar size={'s'} className={'spaceNavGraphic'} name={'error'} />,
        'error'
      );
    }

    return null;
  };

  private getButton = (linkIcon: JSX.Element, linkTitle: string) => {
    // Mimics the current angular-based navigation link
    return (
      <div className="global-nav-link">
        <a className="global-nav-link__anchor" onClick={this.togglePortal}>
          <div className="global-nav-link__icon"> {linkIcon} </div>
          <div className="global-nav-link__title"> {linkTitle} </div>
        </a>
      </div>
    );
  };

  private togglePortal = () => {
    const isOpening = !this.state.isOpen;
    if (isOpening) {
      this.loadSpaces();
    }

    this.setState({
      isOpen: !this.state.isOpen,
    });
  };

  private closePortal = () => {
    this.setState({
      isOpen: false,
    });
  };

  private onSelectSpace = (space: Space) => {
    this.props.spacesManager.changeSelectedSpace(space);
  };
}
