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
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { listBreadcrumb } from '../../services/breadcrumbs';
import routing from '../../services/routing';
import { AutoFollowPatternList } from './auto_follow_pattern_list';
import { SectionUnauthorized } from '../../components';

export const CrossClusterReplicationHome = injectI18n(
  class extends PureComponent {
    static propTypes = {
      autoFollowPatterns: PropTypes.array,
    }

    state = {
      sectionActive: 'auto-follow'
    }

    componentDidMount() {
      chrome.breadcrumbs.set([ MANAGEMENT_BREADCRUMB, listBreadcrumb ]);
    }

    getHeaderSection() {
      const { isAutoFollowApiAuthorized, autoFollowPatterns } = this.props;

      // We want to show the title when the user isn't authorized.
      if (isAutoFollowApiAuthorized && !autoFollowPatterns.length) {
        return null;
      }

      return (
        <Fragment>
          <EuiTitle size="l">
            <h1>
              <FormattedMessage
                id="xpack.crossClusterReplication.autoFollowPatternList.crossClusterReplicationTitle"
                defaultMessage="Cross Cluster Replication"
              />
            </h1>
          </EuiTitle>

          <EuiSpacer size="s" />

          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle size="m">
                <h2>
                  <FormattedMessage
                    id="xpack.crossClusterReplication.autoFollowPatternList.autoFollowPatternsTitle"
                    defaultMessage="Auto-follow patterns"
                  />
                </h2>
              </EuiTitle>

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
                >
                  <FormattedMessage
                    id="xpack.crossClusterReplication.autoFollowPatternList.addAutofollowPatternButtonLabel"
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
          <EuiPageContent
            horizontalPosition="center"
          >
            {this.getHeaderSection()}
            {this.getUnauthorizedSection()}
            <Switch>
              <Route exact path={`${BASE_PATH}/auto_follow_patterns`} component={AutoFollowPatternList} />
            </Switch>
          </EuiPageContent>
        </EuiPageBody>
      );
    }
  }
);
