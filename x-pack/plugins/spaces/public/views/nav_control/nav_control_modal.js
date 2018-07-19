/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiCallOut,
  EuiText,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiOverlayMask,
  EuiAvatar,
  EuiSpacer,
} from '@elastic/eui';
import { SpaceCards, SpaceAvatar } from '../components';
import { Notifier } from 'ui/notify';

export class NavControlModal extends Component {
  state = {
    isOpen: false,
    loading: false,
    activeSpaceExists: true,
    spaces: []
  };

  notifier = new Notifier(`Spaces`);

  async loadSpaces() {
    const {
      spacesManager,
      activeSpace,
    } = this.props;

    this.setState({
      loading: true
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

    this.loadSpaces();

    if (this.props.spacesManager) {
      this.props.spacesManager.on('request_refresh', () => {
        this.loadSpaces();
      });
    }
  }

  render() {
    let modal;
    if (this.state.isOpen) {
      modal = (
        <EuiOverlayMask>
          {this.getActivePortal()}
        </EuiOverlayMask>
      );
    }

    return (
      <div>{this.getActiveSpaceButton()}{modal}</div>
    );
  }

  getActiveSpaceButton = () => {
    const {
      activeSpace
    } = this.props;

    if (!activeSpace) {
      return null;
    }

    // 0 or 1 spaces are available. Either either way, there is no need to render a space selection button
    if (this.state.spaces.length < 2) {
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

  getButton = (linkIcon, linkTitle) => {
    return (
      <div className="global-nav-link">
        <a className="global-nav-link__anchor" onClick={this.togglePortal}>
          <div className="global-nav-link__icon">{linkIcon}</div>
          <div className="global-nav-link__title">{linkTitle}</div>
        </a>
      </div>
    );
  };

  getActivePortal = () => {
    let callout;

    if (!this.state.activeSpaceExists) {
      callout = (
        <Fragment>
          <EuiCallOut title={'Your space is no longer available'}>
            <EuiText>
              Please choose a new Space to continue using Kibana
            </EuiText>
          </EuiCallOut>
          <EuiSpacer />
        </Fragment>
      );

    }

    return (
      <EuiModal onClose={this.closePortal} className={'selectSpaceModal'}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>Select a space</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          {callout}
          <SpaceCards spaces={this.state.spaces} onSpaceSelect={this.onSelectSpace} />
        </EuiModalBody>
      </EuiModal>
    );
  }

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

  onSelectSpace = (space) => {
    this.props.spacesManager.changeSelectedSpace(space);
  }
}

NavControlModal.propTypes = {
  activeSpace: PropTypes.object,
  spacesManager: PropTypes.object.isRequired
};
