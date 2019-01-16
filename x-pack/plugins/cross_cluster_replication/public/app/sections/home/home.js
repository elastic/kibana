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
import { BASE_PATH } from '../../../../common/constants';

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
      followerIndices: PropTypes.array,
      isFollowerIndexApiAuthorized: PropTypes.bool,
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

    getHeaderSection() {
      if(this.state.activeSection === 'follower_indices') {
        const { isFollowerIndexApiAuthorized, followerIndices } = this.props;


        // We want to show the title when the user isn't authorized.
        if (isFollowerIndexApiAuthorized && !followerIndices.length) {
          return null;
        }

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
                {isFollowerIndexApiAuthorized && (
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
                )}
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer />
          </Fragment>
        );
      } else {
        const { isAutoFollowApiAuthorized, autoFollowPatterns } = this.props;

        // We want to show the title when the user isn't authorized.
        if (isAutoFollowApiAuthorized && !autoFollowPatterns.length) {
          return null;
        }

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
                {isAutoFollowApiAuthorized && (
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
                )}
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer />
          </Fragment>
        );
      }
    }

    getUnauthorizedSection() {
      const { isAutoFollowApiAuthorized } = this.props;
      if (!isAutoFollowApiAuthorized) {
        return (
          <SectionUnauthorized>
            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPatternList.noPermissionText"
              defaultMessage="You do not have permission to view or add auto-follow patterns."
            />
          </SectionUnauthorized>
        );
      }
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

            {this.getHeaderSection()}
            {this.getUnauthorizedSection()}

            <Switch>
              <Route exact path={`${BASE_PATH}/follower_indices`} component={FollowerIndicesList} />
              <Route exact path={`${BASE_PATH}/auto_follow_patterns`} component={AutoFollowPatternList} />
            </Switch>
          </EuiPageContent>
        </EuiPageBody>
      );
    }
  }
);
