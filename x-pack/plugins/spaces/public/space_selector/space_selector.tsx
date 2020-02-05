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
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component, Fragment } from 'react';
import ReactDOM from 'react-dom';
import { CoreStart } from 'src/core/public';
import { Space } from '../../common/model/space';
import { SpaceCards } from './components';
import { SPACE_SEARCH_COUNT_THRESHOLD } from '../../common/constants';
import { SpacesManager } from '../spaces_manager';

interface Props {
  spacesManager: SpacesManager;
}

interface State {
  loading: boolean;
  searchTerm: string;
  spaces: Space[];
}

export class SpaceSelector extends Component<Props, State> {
  private headerRef?: HTMLElement | null;
  constructor(props: Props) {
    super(props);

    this.state = {
      loading: false,
      searchTerm: '',
      spaces: [],
    };
  }

  public setHeaderRef = (ref: HTMLElement | null) => {
    this.headerRef = ref;
    // forcing focus of header for screen readers to announce on page load
    if (this.headerRef) {
      this.headerRef.focus();
    }
  };

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
              <h1 tabIndex={0} ref={this.setHeaderRef}>
                <FormattedMessage
                  id="xpack.spaces.spaceSelector.selectSpacesTitle"
                  defaultMessage="Select your space"
                />
              </h1>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.spaces.spaceSelector.changeSpaceAnytimeAvailabilityText"
                  defaultMessage="You can change your space at anytime"
                />
              </p>
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

            {this.state.loading && <EuiLoadingSpinner size="xl" />}

            {!this.state.loading && (
              <SpaceCards spaces={filteredSpaces} onSpaceSelect={this.onSelectSpace} />
            )}

            {!this.state.loading && filteredSpaces.length === 0 && (
              <Fragment>
                <EuiSpacer />
                <EuiText
                  color="subdued"
                  // @ts-ignore
                  textAlign="center"
                >
                  <FormattedMessage
                    id="xpack.spaces.spaceSelector.noSpacesMatchSearchCriteriaDescription"
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
    if (!this.state.spaces || this.state.spaces.length < SPACE_SEARCH_COUNT_THRESHOLD) {
      return null;
    }
    return (
      <EuiFlexItem className="spcSpaceSelector__searchHolder">
        {
          // @ts-ignore onSearch doesn't exist on EuiFieldSearch
          <EuiFieldSearch
            className="spcSpaceSelector__searchField"
            placeholder={i18n.translate('xpack.spaces.spaceSelector.findSpacePlaceholder', {
              defaultMessage: 'Find a space',
            })}
            incremental={true}
            onSearch={this.onSearch}
          />
        }
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

export const renderSpaceSelectorApp = (i18nStart: CoreStart['i18n'], el: Element, props: Props) => {
  ReactDOM.render(
    <i18nStart.Context>
      <SpaceSelector {...props} />
    </i18nStart.Context>,
    el
  );
  return () => ReactDOM.unmountComponentAtNode(el);
};
