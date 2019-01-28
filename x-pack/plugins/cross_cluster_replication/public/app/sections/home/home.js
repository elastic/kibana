/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Route, Switch } from 'react-router-dom';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import chrome from 'ui/chrome';
import { MANAGEMENT_BREADCRUMB } from 'ui/management';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageBody,
  EuiPageContent,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { BASE_PATH } from '../../../../common/constants';
import { listBreadcrumb } from '../../services/breadcrumbs';
import routing from '../../services/routing';
import { AutoFollowPatternList } from './auto_follow_pattern_list';
import { FollowerIndicesList } from './follower_indices_list';
import { SectionUnauthorized } from '../../components';

export const CrossClusterReplicationHome = injectI18n(
  class extends PureComponent {
    static propTypes = {
      autoFollowPatterns: PropTypes.array,
      isAutoFollowApiAuthorized: PropTypes.bool,
      isFollowerIndexApiAuthorized: PropTypes.bool,
      followerIndices: PropTypes.array,
    }

    state = {
      activeSection: 'follower_indices'
    }

    tabs = [{
      id: 'follower_indices',
      name: (
        <FormattedMessage
          id="xpack.crossClusterReplication.autoFollowPatternList.followerIndicesTitle"
          defaultMessage="Follower indices"
        />
      )
    }, {
      id: 'auto_follow_patterns',
      name: (
        <FormattedMessage
          id="xpack.crossClusterReplication.autoFollowPatternList.autoFollowPatternsTitle"
          defaultMessage="Auto-follow patterns"
        />
      )
    }]

    componentDidMount() {
      chrome.breadcrumbs.set([ MANAGEMENT_BREADCRUMB, listBreadcrumb ]);
    }

    static getDerivedStateFromProps(props) {
      const { match: { params: { section } } } = props;
      return {
        activeSection: section
      };
    }

    onSectionChange = (section) => {
      routing.navigate(`/${section}`);
    }

    renderHeaderSection() {
      const { followerIndices, autoFollowPatterns } = this.props;

      // If we're rendering the empty prompt, we don't want to render the header.
      if (this.state.activeSection === 'follower_indices' && followerIndices.length > 0) {
        return (
          <Fragment>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexStart">
              <EuiFlexItem grow={false}>
                <EuiText>
                  <p>
                    <FormattedMessage
                      id="xpack.crossClusterReplication.followerIndexList.followerIndicesDescription"
                      defaultMessage="Followers replicate operations from the leader index to the follower index."
                    />
                  </p>
                </EuiText>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiButton
                  {...routing.getRouterLinkProps('/follower_indices/add')}
                  fill
                  iconType="plusInCircle"
                >
                  <FormattedMessage
                    id="xpack.crossClusterReplication.followerIndexList.addFollowerButtonLabel"
                    defaultMessage="Create a follower index"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer />
          </Fragment>
        );
      }

      // If we're rendering the empty prompt, we don't want to render the header.
      if (autoFollowPatterns.length > 0) {
        return (
          <Fragment>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexStart">
              <EuiFlexItem grow={false}>
                <EuiText>
                  <p>
                    <FormattedMessage
                      id="xpack.crossClusterReplication.autoFollowPatternList.autoFollowPatternsDescription"
                      defaultMessage="Auto-follow patterns replicate leader indices from a remote
                      cluster to follower indices on the local cluster."
                    />
                  </p>
                </EuiText>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiButton
                  {...routing.getRouterLinkProps('/auto_follow_patterns/add')}
                  fill
                  iconType="plusInCircle"
                >
                  <FormattedMessage
                    id="xpack.crossClusterReplication.autoFollowPatternList.addAutoFollowPatternButtonLabel"
                    defaultMessage="Create an auto-follow pattern"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer />
          </Fragment>
        );
      }
    }

    renderContent() {
      const { isAutoFollowApiAuthorized, isFollowerIndexApiAuthorized } = this.props;

      if (!isAutoFollowApiAuthorized || !isFollowerIndexApiAuthorized) {
        return (
          <SectionUnauthorized
            title={(
              <FormattedMessage
                id="xpack.crossClusterReplication.home.permissionErrorTitle"
                defaultMessage="Permission error"
              />
            )}
          >
            <FormattedMessage
              id="xpack.crossClusterReplication.home.permissionErrorText"
              defaultMessage="You do not have permission to view or add follower indices or auto-follow patterns."
            />
          </SectionUnauthorized>
        );
      }

      return (
        <Fragment>
          <EuiTabs>
            {this.tabs.map(tab => (
              <EuiTab
                onClick={() => this.onSectionChange(tab.id)}
                isSelected={tab.id === this.state.activeSection}
                key={tab.id}
              >
                {tab.name}
              </EuiTab>
            ))}
          </EuiTabs>

          <EuiSpacer size="m" />

          {this.renderHeaderSection()}

          <Switch>
            <Route exact path={`${BASE_PATH}/follower_indices`} component={FollowerIndicesList} />
            <Route exact path={`${BASE_PATH}/auto_follow_patterns`} component={AutoFollowPatternList} />
          </Switch>
        </Fragment>
      );
    }

    render() {
      return (
        <EuiPageBody>
          <EuiPageContent>
            <EuiTitle size="l">
              <h1>
                <FormattedMessage
                  id="xpack.crossClusterReplication.autoFollowPatternList.crossClusterReplicationTitle"
                  defaultMessage="Cross Cluster Replication"
                />
              </h1>
            </EuiTitle>

            <EuiSpacer size="s" />

            {this.renderContent()}
          </EuiPageContent>
        </EuiPageBody>
      );
    }
  }
);
