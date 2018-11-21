/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Route, Switch } from 'react-router-dom';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentHeaderSection,
  EuiTitle,
  EuiSpacer,
  EuiPageContentHeader,
  EuiButton,
} from '@elastic/eui';

import routing from '../../services/routing';
import { AutoFollowPatternList } from './auto_follow_pattern_list';
import { BASE_PATH } from '../../../../common/constants';
import { SectionUnauthorized } from '../../components';

export class CrossClusterReplicationHomeUI extends PureComponent {
  static propTypes = {
    autoFollowPatterns: PropTypes.array,
  }

  state = {
    sectionActive: 'auto-follow'
  }

  /**
   * Get the button in top right corner. In phase 1 we only have the auto-follow patterns
   * but in phase 2 it can be either "Add Follower" or "Add auto-follow pattern"
   */
  getButtonHeader() {
    const { autoFollowPatterns } = this.props;
    const { sectionActive } = this.state;

    switch(sectionActive) {
      case 'auto-follow': {
        return autoFollowPatterns.length ? (
          <EuiButton
            {...routing.getRouterLinkProps(`${BASE_PATH}/auto_follow_patterns/add`)}
            fill
          >
            <FormattedMessage
              id="xpack.cross_cluster_replication.addAutoFollowPatternButtonLabel"
              defaultMessage="Add auto-follow pattern"
            />
          </EuiButton>
        ) : null;
      }
      default: {
        // We will render here the "Create Follower" in Phase 2.
        return null;
      }
    }
  }

  getHeaderSection() {
    return (
      <Fragment>
        <EuiPageContentHeader>
          <EuiPageContentHeaderSection>
            <EuiTitle size="l">
              <h1>
                <FormattedMessage
                  id="xpack.cross_cluster_replication.crossClusterReplicationTitle"
                  defaultMessage="Cross Cluster Replication"
                />
              </h1>
            </EuiTitle>
          </EuiPageContentHeaderSection>
          <EuiPageContentHeaderSection>
            {this.getButtonHeader()}
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>
        <EuiSpacer />
      </Fragment>
    );
  }

  /**
   * In phase 1 we only have the aufo-follow patterns but in phase 2 we will add
   * the follower indices. We will render here the Tab navigation at that moment.
   * For now we simply render a Title
   */
  getTabsNav() {
    const { autoFollowPatterns, isAutoFollowApiAuthorized } = this.props;
    const showTitle = autoFollowPatterns.length || !isAutoFollowApiAuthorized;

    return showTitle ? (
      <Fragment>
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="xpack.cross_cluster_replication.autoFollowPatternListTitle"
              defaultMessage="Auto-follow patterns"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer />
      </Fragment>
    ) : null;
  }

  getUnauthorizedSection() {
    const { isAutoFollowApiAuthorized } = this.props;
    if (!isAutoFollowApiAuthorized) {
      return (
        <SectionUnauthorized>
          <FormattedMessage
            id="xpack.cross_cluster_replication.autoFollowPatternList.noPermissionText"
            defaultMessage="You do not have permission to view or add auto-follow patterns."
          />
        </SectionUnauthorized>
      );
    }
  }

  render() {
    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageContent>
            {this.getHeaderSection()}
            {this.getTabsNav()}
            {this.getUnauthorizedSection()}

            <Switch>
              <Route exact path={`${BASE_PATH}/auto_follow_patterns`} component={AutoFollowPatternList}/>
            </Switch>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}

export const CrossClusterReplicationHome = injectI18n(CrossClusterReplicationHomeUI);
