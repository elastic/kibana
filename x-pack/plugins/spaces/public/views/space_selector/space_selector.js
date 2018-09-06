/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiPage,
  EuiPageHeader,
  EuiPageBody,
  EuiPageContent,
  EuiPageHeaderSection,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { SpaceCards } from '../components/space_cards';
import { SPACE_SEARCH_COUNT_THRESHOLD } from '../../../common/constants';

export class SpaceSelector extends Component {
  state = {
    loading: false,
    searchTerm: '',
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
      spaces,
      searchTerm,
    } = this.state;

    let filteredSpaces = spaces;
    if (searchTerm) {
      filteredSpaces = spaces
        .filter(space => space.name.toLowerCase().indexOf(searchTerm) >= 0 || space.description.toLowerCase().indexOf(searchTerm) >= 0);
    }

    return (
      <EuiPage className="spaceSelector__page">
        <EuiPageBody>
          <EuiPageHeader className="spaceSelector__heading">
            <EuiPageHeaderSection className="spaceSelector__logoHeader">
              <div className="spaceSelector__logoCircle">
                <EuiIcon size="xxl" type={`logoKibana`} />
              </div>

              <EuiSpacer />

              <EuiTitle size="l" className="euiTextColor--ghost">
                <p >Select your space</p>
              </EuiTitle>
            </EuiPageHeaderSection>
          </EuiPageHeader>
          <EuiPageContent className="spaceSelector__pageContent">

            <EuiFlexGroup direction="column" alignItems="center" responsive={false}>
              {this.getSearchField()}

              <EuiFlexItem>
                <EuiText size="xs"><p>You can change your space at anytime.</p></EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="xl" />

            <SpaceCards spaces={filteredSpaces} onSpaceSelect={this.onSelectSpace} />

            {
              filteredSpaces.length === 0 &&
              <Fragment>
                <EuiSpacer />
                <EuiText color="subdued" textAlign="center">No spaces match search criteria</EuiText>
              </Fragment>
            }

          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }

  getSearchField = () => {
    if (!this.props.spaces || this.props.spaces.length < SPACE_SEARCH_COUNT_THRESHOLD) {
      return null;
    }
    return (
      <EuiFlexItem className="spaceSelector__searchHolder">
        <EuiFieldSearch
          className="spaceSelector__searchField"
          placeholder="Find a space"
          incremental={true}
          onSearch={this.onSearch}
        />
      </EuiFlexItem>
    );
  }

  onSearch = (searchTerm = '') => {
    this.setState({
      searchTerm: searchTerm.trim().toLowerCase()
    });
  }

  onSelectSpace = (space) => {
    this.props.spacesManager.changeSelectedSpace(space);
  }
}

SpaceSelector.propTypes = {
  spaces: PropTypes.array,
  spacesManager: PropTypes.object.isRequired
};
