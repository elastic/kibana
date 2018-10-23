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
  EuiPageHeaderSection,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
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

export class SpaceSelectorUI extends Component<Props, State> {
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
      <EuiPage className="spaceSelector__page" data-test-subj="kibanaSpaceSelector">
        <EuiPageBody>
          <EuiPageHeader className="spaceSelector__heading">
            <EuiPageHeaderSection className="spaceSelector__logoHeader">
              <div className="spaceSelector__logoCircle">
                <EuiIcon size="xxl" type={`logoKibana`} />
              </div>

              <EuiSpacer />

              <EuiTitle size="l" className="euiTextColor--ghost">
                <p>
                  <FormattedMessage
                    id="xpack.spaces.view.spaceSelector.spaceSelector.selectSpacesTitle"
                    defaultMessage="Select your space"
                  />
                </p>
              </EuiTitle>
            </EuiPageHeaderSection>
          </EuiPageHeader>
          <EuiPageContent className="spaceSelector__pageContent">
            <EuiFlexGroup
              // @ts-ignore
              direction="column"
              alignItems="center"
              responsive={false}
            >
              {this.getSearchField()}

              <EuiFlexItem>
                <EuiText size="xs">
                  <p>
                    <FormattedMessage
                      id="xpack.spaces.view.spaceSelector.spaceSelector.youCanChangeSpaceAnytimeTitle"
                      defaultMessage="You can change your spacasdasdasde at anytime."
                    />
                  </p>
                </EuiText>
              </EuiFlexItem>
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
                  <FormattedMessage
                    id="xpack.spaces.view.spaceSelector.spaceSelector.noSpacesMatchSearchTitle"
                    defaultMessage="No spaces match search criteria"
                  />
                </EuiText>
              </Fragment>
            )}
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }

  public getSearchField = () => {
    const { intl } = this.props;
    if (!this.props.spaces || this.props.spaces.length < SPACE_SEARCH_COUNT_THRESHOLD) {
      return null;
    }
    return (
      <EuiFlexItem className="spaceSelector__searchHolder">
        <EuiFieldSearch
          className="spaceSelector__searchField"
          placeholder={intl.formatMessage({
            id: 'xpack.spaces.view.spaceSelector.spaceSelector.findSpaceTitle',
            defaultMessage: 'Find a space',
          })}
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

export const SpaceSelector = injectI18n(SpaceSelectorUI);
