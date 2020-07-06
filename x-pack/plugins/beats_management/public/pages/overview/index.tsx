/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTab,
  // @ts-ignore types for EuiTab not currently available
  EuiTabs,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { Subscribe } from 'unstated';
import { CMBeat } from '../../../../../legacy/plugins/beats_management/common/domain_types';
import { PrimaryLayout } from '../../components/layouts/primary';
import { ChildRoutes } from '../../components/navigation/child_routes';
import { BeatsContainer } from '../../containers/beats';
import { TagsContainer } from '../../containers/tags';
import { withUrlState } from '../../containers/with_url_state';
import { AppPageProps } from '../../frontend_types';

interface MainPagesState {
  enrollBeat?: {
    enrollmentToken: string;
  } | null;
  beats: CMBeat[];
  loadedBeatsAtLeastOnce: boolean;
}

class MainPageComponent extends React.PureComponent<AppPageProps, MainPagesState> {
  constructor(props: AppPageProps) {
    super(props);
    this.state = {
      loadedBeatsAtLeastOnce: false,
      beats: [],
    };
  }
  public onTabClicked = (path: string) => {
    return () => {
      this.props.goTo(path);
    };
  };

  public render() {
    return (
      <PrimaryLayout
        title={
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiFlexItem grow={false}>{'Beats'}</EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiBetaBadge
                label={i18n.translate('xpack.beatsManagement.overview.betaBadgeText', {
                  defaultMessage: 'Beta',
                })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        hideBreadcrumbs={this.props.libs.framework.versionGreaterThen('6.7.0')}
      >
        {(renderAction: any) => (
          <Subscribe to={[BeatsContainer, TagsContainer]}>
            {(beats: BeatsContainer, tags: TagsContainer) => (
              <React.Fragment>
                <EuiTabs>
                  <EuiTab
                    isSelected={`/overview/enrolled_beats` === this.props.history.location.pathname}
                    onClick={this.onTabClicked(`/overview/enrolled_beats`)}
                  >
                    <FormattedMessage
                      id="xpack.beatsManagement.beats.enrolledBeatsTabTitle"
                      defaultMessage="Enrolled Beats"
                    />
                  </EuiTab>
                  <EuiTab
                    isSelected={
                      `/overview/configuration_tags` === this.props.history.location.pathname
                    }
                    onClick={this.onTabClicked(`/overview/configuration_tags`)}
                  >
                    <FormattedMessage
                      id="xpack.beatsManagement.beats.configurationTagsTabTitle"
                      defaultMessage="Configuration tags"
                    />
                  </EuiTab>
                </EuiTabs>
                <ChildRoutes
                  routes={this.props.routes}
                  renderAction={renderAction}
                  {...this.props}
                  beatsContainer={beats}
                  tagsContainer={tags}
                />
              </React.Fragment>
            )}
          </Subscribe>
        )}
      </PrimaryLayout>
    );
  }
}

export const MainPage = withUrlState<AppPageProps>(MainPageComponent);
