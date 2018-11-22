/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
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
  EuiText,
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

  getHeaderSection() {
    const { autoFollowPatterns } = this.props;

    return (
      <Fragment>
        <EuiPageContentHeader>
          <EuiPageContentHeaderSection>
            <EuiTitle size="l">
              <h1>
                <FormattedMessage
                  id="xpack.cross_cluster_replication.cross_cluster_replication_title"
                  defaultMessage="Cross Cluster Replication"
                />
              </h1>
            </EuiTitle>
          </EuiPageContentHeaderSection>
          <EuiPageContentHeaderSection>
            { autoFollowPatterns.length
              ? (
                <EuiButton
                  {...routing.getRouterLinkProps(`${BASE_PATH}/auto_follow_patterns/add`)}
                  fill
                >
                  <FormattedMessage
                    id="xpack.cross_cluster_replication.add_autofollow_pattern_button_label"
                    defaultMessage="Add auto-follow pattern"
                  />
                </EuiButton>
              )
              : null }
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
  getTitleSection() {
    const { autoFollowPatterns, isAutoFollowApiAuthorized } = this.props;
    const showTitle = autoFollowPatterns.length || !isAutoFollowApiAuthorized;

    return showTitle ? (
      <Fragment>
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="xpack.cross_cluster_replication.autofollow_pattern_list_title"
              defaultMessage="Auto-follow patterns"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.cross_cluster_replication.autofolloPatternList.sectionDescription"
              defaultMessage="Manage your auto-follow patterns"
            />
          </p>
        </EuiText>
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
            id="xpack.cross_cluster_replication.autofollow_pattern_list.no_permission_text"
            defaultMessage="You do not have permission to view or add auto-follow patterns."
          />
        </SectionUnauthorized>
      );
    }
  }

  getSection() {
    const { match: { params: { section } } } = this.props;

    switch(section) {
      default: {
        return <AutoFollowPatternList />;
      }
    }
  }

  render() {
    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageContent>
            {this.getHeaderSection()}
            {this.getTitleSection()}
            {this.getUnauthorizedSection()}
            {this.getSection()}
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}

export const CrossClusterReplicationHome = injectI18n(CrossClusterReplicationHomeUI);
