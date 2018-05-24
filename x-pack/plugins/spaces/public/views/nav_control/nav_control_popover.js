/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  EuiAvatar,
  EuiPopover,
} from '@elastic/eui';
import { Notifier } from 'ui/notify';
import { SpacesContextMenu } from './components/spaces_context_menu';

export class NavControlPopover extends Component {
  state = {
    isOpen: false,
    loading: false,
    spaces: []
  };

  notifier = new Notifier(`Spaces`);

  async loadSpaces() {
    const {
      spacesManager
    } = this.props;

    this.setState({
      loading: true
    });

    const spaces = await spacesManager.getSpaces();
    this.setState({
      spaces,
      loading: false
    });
  }

  componentDidMount() {
    const {
      activeSpace
    } = this.props;

    if (activeSpace && !activeSpace.valid) {
      const { error = {} } = activeSpace;
      if (error.message) {
        this.notifier.error(error.message);
      }
    }
  }

  render() {
    return (
      <EuiPopover
        className={'spaceSelectorPopover'}
        anchorPosition={'upCenter'}
        panelPaddingSize={'none'}
        isOpen={this.state.isOpen}
        button={this.getActiveSpaceButton()}
        closePopover={this.closePortal}
      >
        <SpacesContextMenu spaces={this.state.spaces} showManageButton={false} onSelectSpace={this.onSelectSpace} />
      </EuiPopover>
    );
  }

  getActiveSpaceButton = () => {
    const {
      activeSpace
    } = this.props;

    if (!activeSpace) {
      return null;
    }

    if (activeSpace.valid && activeSpace.space) {
      return this.getButton(
        <EuiAvatar size={'s'} className={'spaceNavGraphic'} name={activeSpace.space.name} />,
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

  getButton = (linkIcon, linkTitle) => {
    return (
      <div className="global-nav-link" onClick={this.expandGlobalNav}>
        <a className="global-nav-link__anchor" onClick={this.togglePortal}>
          <div className="global-nav-link__icon">{linkIcon}</div>
          <div className="global-nav-link__title">{linkTitle}</div>
        </a>
      </div>
    );
  };

  togglePortal = () => {
    const isOpening = !this.state.isOpen;
    if (isOpening) {
      this.loadSpaces();
    }

    this.setState({
      isOpen: !this.state.isOpen
    });
  };

  closePortal = () => {
    this.setState({
      isOpen: false
    });
  }

  expandGlobalNav = () => {
    const { globalNavState } = this.props;
    if (!globalNavState.isOpen()) {
      globalNavState.setOpen(true);
    }
  }

  onSelectSpace = (space) => {
    this.props.spacesManager.changeSelectedSpace(space);
  }
}

NavControlPopover.propTypes = {
  activeSpace: PropTypes.object,
  spacesManager: PropTypes.object.isRequired,
  globalNavState: PropTypes.object.isRequired,
};
