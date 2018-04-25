/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiOverlayMask,
  EuiAvatar,
} from '@elastic/eui';
import { SpaceCards } from '../components/space_cards';

export class NavControlModal extends Component {
    state = {
      isOpen: false,
      loading: false,
      spaces: []
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

      spacesManager.getSpaces()
        .then(spaces => {
          this.setState({
            spaces,
            loading: false
          });
        });
    }

    render() {
      const button = (
        <div className="global-nav-link">
          <a className="global-nav-link__anchor" onClick={this.togglePortal}>
            <div className="global-nav-link__icon"><EuiAvatar size={'s'} name={'Engineering'} /></div>
            <div className="global-nav-link__title">Engineering</div>
          </a>
        </div>
      );

      let modal;
      if (this.state.isOpen) {
        modal = (
          <EuiOverlayMask>
            <EuiModal onClose={this.closePortal} className={'selectSpaceModal'}>
              <EuiModalHeader><EuiModalHeaderTitle>Select a space</EuiModalHeaderTitle></EuiModalHeader>
              <EuiModalBody>
                <SpaceCards spaces={this.state.spaces} />
              </EuiModalBody>
            </EuiModal>
          </EuiOverlayMask>
        );
      }

      return (
        <div>{button}{modal}</div>
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
}
