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

    if (!autoFollowPatterns.length) {
      return null;
    }

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
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.cross_cluster_replication.autofolloPatternList.sectionDescription"
                  defaultMessage="Auto-follow patterns replicate leader indices from a remote cluster to follower indices on the local cluster." //eslint-disable-line max-len
                />
              </p>
            </EuiText>
          </EuiPageContentHeaderSection>
          <EuiPageContentHeaderSection>
            <EuiButton
              {...routing.getRouterLinkProps('/auto_follow_patterns/add')}
              fill
            >
              <FormattedMessage
                id="xpack.cross_cluster_replication.add_autofollow_pattern_button_label"
                defaultMessage="Create an auto-follow pattern"
              />
            </EuiButton>
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>
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
            {this.getUnauthorizedSection()}
            {this.getSection()}
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}

export const CrossClusterReplicationHome = injectI18n(CrossClusterReplicationHomeUI);
