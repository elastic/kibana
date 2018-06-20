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
  EuiTextColor,
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
        .filter(s => s.name.toLowerCase().indexOf(searchTerm) >= 0 || s.description.toLowerCase().indexOf(searchTerm) >= 0);
    }

    return (
      <EuiPage className="spaceSelector__page">
        <EuiPageHeader className="spaceSelector__heading">
          <EuiPageHeaderSection className="logoHeader">
            <div className="logoCircle">
              <EuiIcon size="xxl" type={`logoKibana`} />
            </div>

            <EuiSpacer />

            <EuiTitle color="ghost">
              <EuiTextColor color="ghost"><p>Select your space</p></EuiTextColor>
            </EuiTitle>

            <EuiSpacer />
          </EuiPageHeaderSection>
        </EuiPageHeader>
        <EuiPageBody>
          <EuiPageContent className="spaceSelectorPageContent">

            <EuiFlexGroup direction="column" alignItems="center">
              {this.getSearchField()}

              <EuiFlexItem>
                <EuiText><p>You can change your space at anytime from within Kibana.</p></EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer />

            <SpaceCards spaces={filteredSpaces} />

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
      <EuiFlexItem>
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
}

SpaceSelector.propTypes = {
  spaces: PropTypes.array,
  spacesManager: PropTypes.object.isRequired
};
