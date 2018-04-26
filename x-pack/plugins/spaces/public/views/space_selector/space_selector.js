/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import {
  EuiPage,
  EuiPageHeader,
  EuiPageBody,
  EuiPageContent,
  EuiPageHeaderSection,
  EuiCard,
  EuiIcon,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

export class SpaceSelector extends Component {
  state = {
    loading: false,
    spaces: []
  };

  componentDidMount() {
    this.loadSpaces();
  }

  loadSpaces() {
    this.setState({ loading: true });
    const { httpAgent, chrome } = this.props;

    httpAgent
      .get(chrome.addBasePath(`/api/spaces/v1/spaces`))
      .then(response => {
        this.setState({
          loading: false,
          spaces: response.data
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

            <EuiFlexGroup gutterSize="l" justifyContent="spaceEvenly" className="spacesGroup">
              {spaces.map(this.renderSpace)}
            </EuiFlexGroup>

            <EuiText className="spaceProfileText">
              <p>You can change your workspace at anytime by accessing your profile within Kibana.</p>
            </EuiText>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }

  renderSpace = (space) => {
    return (
      <EuiFlexItem key={space.id} grow={false} className="spaceCard">
        <EuiCard
          icon={<EuiIcon size="xxl" type={space.logo} />}
          title={this.renderSpaceTitle(space)}
          description={space.description}
          onClick={() => window.alert('Card clicked')}
        />
      </EuiFlexItem>
    );
  };

  renderSpaceTitle = (space) => {
    return (
      <div className="spaceCardTitle">
        <span>{space.name}</span>
        {/* <EuiIcon type={'starEmpty'} size="s" /> */}
      </div>
    );
  };

}
