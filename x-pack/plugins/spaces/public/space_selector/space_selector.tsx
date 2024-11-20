/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './space_selector.scss';

import {
  EuiFieldSearch,
  EuiImage,
  EuiLoadingSpinner,
  EuiPanel,
  EuiPortal,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import React, { Component, Fragment } from 'react';
import ReactDOM from 'react-dom';
import type { Observable, Subscription } from 'rxjs';

import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaSolutionAvatar } from '@kbn/shared-ux-avatar-solution';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { SpaceCards } from './components';
import type { Space } from '../../common';
import { SPACE_SEARCH_COUNT_THRESHOLD } from '../../common/constants';
import type { SpacesManager } from '../spaces_manager';

interface Props {
  spacesManager: SpacesManager;
  serverBasePath: string;
  customBranding$: Observable<CustomBranding>;
}

interface State {
  loading: boolean;
  searchTerm: string;
  spaces: Space[];
  error?: Error;
  customLogo?: string;
}

export class SpaceSelector extends Component<Props, State> {
  private headerRef?: HTMLElement | null;
  private customBrandingSubscription?: Subscription;

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
    this.customBrandingSubscription = this.props.customBranding$.subscribe((next) => {
      this.setState({ ...this.state, customLogo: next.logo });
    });
  }

  public componentWillUnmount() {
    this.customBrandingSubscription?.unsubscribe();
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
      <KibanaPageTemplate className="spcSpaceSelector" data-test-subj="kibanaSpaceSelector">
        {/* Portal the fixed background graphic so it doesn't affect page positioning or overlap on top of global banners */}
        <EuiPortal>
          <div
            className="spcSelectorBackground spcSelectorBackground__nonMixinAttributes"
            role="presentation"
          />
        </EuiPortal>

        <KibanaPageTemplate.Section color="transparent" paddingSize="xl">
          <EuiText textAlign="center" size="s">
            <EuiSpacer size="xxl" />
            {this.state.customLogo ? (
              <EuiImage
                src={this.state.customLogo}
                size={64}
                alt={i18n.translate('xpack.spaces.spaceSelector.customLogoAlt', {
                  defaultMessage: 'Custom logo',
                })}
              />
            ) : (
              <KibanaSolutionAvatar name="Elastic" size="xl" />
            )}
            <EuiSpacer size="xxl" />
            <EuiTextColor color="subdued">
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
              <p>
                <FormattedMessage
                  id="xpack.spaces.spaceSelector.changeSpaceAnytimeAvailabilityText"
                  defaultMessage="You can change your space at anytime."
                />
              </p>
            </EuiTextColor>
          </EuiText>
          <EuiSpacer size="xl" />

          {this.getSearchField()}

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
        </KibanaPageTemplate.Section>
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
      <>
        <div className="spcSpaceSelector__searchHolder">
          <EuiFieldSearch
            placeholder={inputLabel}
            aria-label={inputLabel}
            incremental={true}
            onSearch={this.onSearch}
          />
        </div>
        <EuiSpacer size="xl" />
      </>
    );
  };

  public onSearch = (searchTerm = '') => {
    this.setState({
      searchTerm: searchTerm.trim().toLowerCase(),
    });
  };
}

export const renderSpaceSelectorApp = (
  services: Pick<CoreStart, 'analytics' | 'i18n' | 'theme'>,
  { element }: Pick<AppMountParameters, 'element'>,
  props: Props
) => {
  ReactDOM.render(
    <KibanaRenderContextProvider {...services}>
      <SpaceSelector {...props} />
    </KibanaRenderContextProvider>,
    element
  );
  return () => ReactDOM.unmountComponentAtNode(element);
};
