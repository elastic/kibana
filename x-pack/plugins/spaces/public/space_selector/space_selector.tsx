/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './space_selector.scss';

import {
  EuiFieldSearch,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import React, { Component, Fragment } from 'react';
import ReactDOM from 'react-dom';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaSolutionAvatar } from '@kbn/shared-ux-components';
import type { AppMountParameters, CoreStart } from 'src/core/public';

import {
  KibanaPageTemplate,
  KibanaThemeProvider,
} from '../../../../../src/plugins/kibana_react/public';
import type { Space } from '../../common';
import { SPACE_SEARCH_COUNT_THRESHOLD } from '../../common/constants';
import type { SpacesManager } from '../spaces_manager';
import { SpaceCards } from './components';

interface Props {
  spacesManager: SpacesManager;
  serverBasePath: string;
}

interface State {
  loading: boolean;
  searchTerm: string;
  spaces: Space[];
  error?: Error;
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

    spacesManager
      .getSpaces()
      .then((spaces) => {
        this.setState({
          loading: false,
          spaces,
        });
      })
      .catch((err) => {
        this.setState({
          loading: false,
          error: err,
        });
      });
  }

  public render() {
    const { spaces, searchTerm } = this.state;

    let filteredSpaces = spaces;
    if (searchTerm) {
      filteredSpaces = spaces.filter(
        (space) =>
          space.name.toLowerCase().indexOf(searchTerm) >= 0 ||
          (space.description || '').toLowerCase().indexOf(searchTerm) >= 0
      );
    }

    return (
      <KibanaPageTemplate
        template="empty"
        className="spcSpaceSelector"
        data-test-subj="kibanaSpaceSelector"
        pageContentBodyProps={{ className: 'spcSpaceSelector__pageContent' }}
      >
        <EuiText textAlign="center" size="s">
          <EuiSpacer size="xxl" />
          <KibanaSolutionAvatar name="Elastic" size="xl" />
          <EuiSpacer size="xxl" />
          <h1
            // plain `eui` class undos forced focus style on non-EUI components
            className="eui spcSpaceSelector__pageHeader"
            tabIndex={0}
            ref={this.setHeaderRef}
          >
            <FormattedMessage
              id="xpack.spaces.spaceSelector.selectSpacesTitle"
              defaultMessage="Select your space"
            />
          </h1>
          <EuiTextColor color="subdued">
            <p>
              <FormattedMessage
                id="xpack.spaces.spaceSelector.changeSpaceAnytimeAvailabilityText"
                defaultMessage="You can change your space at anytime."
              />
            </p>
          </EuiTextColor>
        </EuiText>
        <EuiSpacer size="xxl" />

        {this.getSearchField()}

        <EuiSpacer size="xl" />

        {this.state.loading && <EuiLoadingSpinner size="xl" />}

        {!this.state.loading && (
          <SpaceCards spaces={filteredSpaces} serverBasePath={this.props.serverBasePath} />
        )}

        {!this.state.loading && !this.state.error && filteredSpaces.length === 0 && (
          <Fragment>
            <EuiSpacer />
            <EuiPanel className="spcSpaceSelector__errorPanel" color="subdued">
              <EuiTitle size="xs">
                <h2>
                  {i18n.translate(
                    'xpack.spaces.spaceSelector.noSpacesMatchSearchCriteriaDescription',
                    {
                      defaultMessage: 'No spaces match {searchTerm}',
                      values: { searchTerm: `"${this.state.searchTerm}"` },
                    }
                  )}
                </h2>
              </EuiTitle>
            </EuiPanel>
          </Fragment>
        )}

        {!this.state.loading && this.state.error && (
          <Fragment>
            <EuiSpacer />
            <EuiPanel color="danger" className="spcSpaceSelector__errorPanel">
              <EuiText size="s" color="danger">
                <h2>
                  <FormattedMessage
                    id="xpack.spaces.spaceSelector.errorLoadingSpacesDescription"
                    defaultMessage="Error loading spaces ({message})"
                    values={{ message: this.state.error.message }}
                  />
                </h2>
                <p>
                  <FormattedMessage
                    id="xpack.spaces.spaceSelector.contactSysAdminDescription"
                    defaultMessage="Contact your system administrator."
                  />
                </p>
              </EuiText>
            </EuiPanel>
          </Fragment>
        )}
      </KibanaPageTemplate>
    );
  }

  public getSearchField = () => {
    if (!this.state.spaces || this.state.spaces.length < SPACE_SEARCH_COUNT_THRESHOLD) {
      return null;
    }

    const inputLabel = i18n.translate('xpack.spaces.spaceSelector.findSpacePlaceholder', {
      defaultMessage: 'Find a space',
    });

    return (
      <div className="spcSpaceSelector__searchHolder">
        <EuiFieldSearch
          placeholder={inputLabel}
          aria-label={inputLabel}
          incremental={true}
          onSearch={this.onSearch}
        />
      </div>
    );
  };

  public onSearch = (searchTerm = '') => {
    this.setState({
      searchTerm: searchTerm.trim().toLowerCase(),
    });
  };
}

export const renderSpaceSelectorApp = (
  i18nStart: CoreStart['i18n'],
  { element, theme$ }: Pick<AppMountParameters, 'element' | 'theme$'>,
  props: Props
) => {
  ReactDOM.render(
    <i18nStart.Context>
      <KibanaThemeProvider theme$={theme$}>
        <SpaceSelector {...props} />
      </KibanaThemeProvider>
    </i18nStart.Context>,
    element
  );
  return () => ReactDOM.unmountComponentAtNode(element);
};
