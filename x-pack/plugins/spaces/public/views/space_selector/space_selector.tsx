/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { SpacesManager } from 'plugins/spaces/lib';
import React, { Component, Fragment } from 'react';
import { SPACE_SEARCH_COUNT_THRESHOLD } from '../../../common/constants';
import { Space } from '../../../common/model/space';
import { SpaceCards } from '../components/space_cards';

interface Props {
  spaces?: Space[];
  spacesManager: SpacesManager;
}

interface State {
  loading: boolean;
  searchTerm: string;
  spaces: Space[];
}

export class SpaceSelector extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    const state: State = {
      loading: false,
      searchTerm: '',
      spaces: [],
    };

    if (Array.isArray(props.spaces)) {
      state.spaces = [...props.spaces];
    }

    this.state = state;
  }

  public componentDidMount() {
    if (this.state.spaces.length === 0) {
      this.loadSpaces();
    }
  }

  public loadSpaces() {
    this.setState({ loading: true });
    const { spacesManager } = this.props;

    spacesManager.getSpaces().then(spaces => {
      this.setState({
        loading: false,
        spaces,
      });
    });
  }

  public render() {
    const { spaces, searchTerm } = this.state;

    let filteredSpaces = spaces;
    if (searchTerm) {
      filteredSpaces = spaces.filter(
        space =>
          space.name.toLowerCase().indexOf(searchTerm) >= 0 ||
          (space.description || '').toLowerCase().indexOf(searchTerm) >= 0
      );
    }

    return (
      <EuiPage className="spcSpaceSelector" data-test-subj="kibanaSpaceSelector">
        <EuiPageBody>
          <EuiPageHeader className="spcSpaceSelector__heading">
            <EuiSpacer size="xxl" />
            <span className="spcSpaceSelector__logo">
              <EuiIcon size="xxl" type={`logoKibana`} />
            </span>
            <EuiTitle size="l">
              <h1>Select your space</h1>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              <p>You can change your space at anytime</p>
            </EuiText>
          </EuiPageHeader>
          <EuiPageContent className="spcSpaceSelector__pageContent">
            <EuiFlexGroup
              // @ts-ignore
              direction="column"
              alignItems="center"
              responsive={false}
            >
              {this.getSearchField()}
            </EuiFlexGroup>

            <EuiSpacer size="xl" />

            <SpaceCards spaces={filteredSpaces} onSpaceSelect={this.onSelectSpace} />

            {filteredSpaces.length === 0 && (
              <Fragment>
                <EuiSpacer />
                <EuiText
                  color="subdued"
                  // @ts-ignore
                  textAlign="center"
                >
                  No spaces match search criteria
                </EuiText>
              </Fragment>
            )}
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }

  public getSearchField = () => {
    if (!this.props.spaces || this.props.spaces.length < SPACE_SEARCH_COUNT_THRESHOLD) {
      return null;
    }
    return (
      <EuiFlexItem className="spcSpaceSelector__searchHolder">
        <EuiFieldSearch
          className="spcSpaceSelector__searchField"
          placeholder="Find a space"
          incremental={true}
          // @ts-ignore
          onSearch={this.onSearch}
        />
      </EuiFlexItem>
    );
  };

  public onSearch = (searchTerm = '') => {
    this.setState({
      searchTerm: searchTerm.trim().toLowerCase(),
    });
  };

  public onSelectSpace = (space: Space) => {
    this.props.spacesManager.changeSelectedSpace(space);
  };
}
