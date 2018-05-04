/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  EuiPage,
  EuiPageHeader,
  EuiPageBody,
  EuiPageContent,
  EuiPageHeaderSection,
  EuiIcon,
  EuiText,
} from '@elastic/eui';
import { SpaceCards } from '../components/space_cards';

export class SpaceSelector extends Component {
  state = {
    loading: false,
    spaces: []
  };

  constructor(props) {
    super(props);
    if (Array.isArray(props.spaces)) {
      this.state.spaces = [...props.spaces];
    }
  }

  componentDidMount() {
    if (this.state.spaces.length === 0) {
      this.loadSpaces();
    }
  }

  loadSpaces() {
    this.setState({ loading: true });
    const { spacesManager } = this.props;

    spacesManager.getSpaces()
      .then(spaces => {
        this.setState({
          loading: false,
          spaces
        });
      });
  }

  render() {
    const {
      spaces
    } = this.state;

    return (
      <EuiPage>
        <EuiPageHeader>
          <EuiPageHeaderSection className="logoHeader">
            <EuiIcon size="xxl" type={`logoKibana`} />
          </EuiPageHeaderSection>
        </EuiPageHeader>
        <EuiPageBody>
          <EuiPageContent>
            <EuiText className="spaceWelcomeText">
              <p className="welcomeLarge">Welcome to Kibana.</p>
              <p className="welcomeMedium">Select a space to begin.</p>
            </EuiText>

            <SpaceCards spaces={spaces} />

            <EuiText className="spaceProfileText">
              <p>You can change your workspace at anytime by accessing your profile within Kibana.</p>
            </EuiText>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}

SpaceSelector.propTypes = {
  spaces: PropTypes.array,
  spacesManager: PropTypes.object.isRequired
};
