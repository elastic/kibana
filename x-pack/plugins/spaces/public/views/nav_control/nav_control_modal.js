/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiOverlayMask,
  EuiAvatar,
  EuiLoadingSpinner
} from '@elastic/eui';
import { SpaceCards } from '../components/space_cards';

export class NavControlModal extends Component {
    state = {
      isOpen: false,
      loading: false,
      spaces: [],
      activeSpace: null
    };

    componentDidMount() {
      this.loadSpaces();
    }

    loadSpaces() {
      const {
        spacesManager
      } = this.props;

      this.setState({
        loading: true
      });

      Promise.all([
        spacesManager.getSpaces(),
        spacesManager.getActiveSpace()
      ]).then(([spaces, activeSpace]) => {
        this.setState({
          spaces,
          activeSpace,
          loading: false
        });
      });
    }

    render() {
      let modal;
      if (this.state.isOpen) {
        modal = (
          <EuiOverlayMask>
            <EuiModal onClose={this.closePortal} className={'selectSpaceModal'}>
              <EuiModalHeader>
                <EuiModalHeaderTitle>Select a space</EuiModalHeaderTitle>
              </EuiModalHeader>
              <EuiModalBody>
                <SpaceCards spaces={this.state.spaces} />
              </EuiModalBody>
            </EuiModal>
          </EuiOverlayMask>
        );
      }

      return (
        <div>{this.getActiveSpaceButton()}{modal}</div>
      );
    }

    getActiveSpaceButton = () => {
      const {
        loading,
        activeSpace
      } = this.state;

      if (loading) {
        return this.getButton(
          <EuiLoadingSpinner size={'m'} className={'spaceNavGraphic'}/>,
          ''
        );
      }

      if (activeSpace && activeSpace.hasOwnProperty('name')) {
        return this.getButton(
          <EuiAvatar size={'s'} className={'spaceNavGraphic'} name={activeSpace.name} />,
          activeSpace.name
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
}

NavControlModal.propTypes = {
  spacesManager: PropTypes.object.isRequired
};
