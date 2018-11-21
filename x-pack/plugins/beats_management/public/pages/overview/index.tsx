/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Subscribe } from 'unstated';
import { CMPopulatedBeat } from '../../../common/domain_types';
import { PrimaryLayout } from '../../components/layouts/primary';
import { ChildRoutes } from '../../components/navigation/child_routes';
import { ConnectedTabs } from '../../components/navigation/connected_tabs';
import { BeatsContainer } from '../../containers/beats';
import { TagsContainer } from '../../containers/tags';
import { withUrlState } from '../../containers/with_url_state';
import { AppPageProps } from '../../frontend_types';

interface MainPagesState {
  enrollBeat?: {
    enrollmentToken: string;
  } | null;
  beats: CMPopulatedBeat[];
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
  public onSelectedTabChanged = (id: string) => {
    this.props.goTo(id);
  };

  public render() {
    return (
      <PrimaryLayout title="Beats">
        {(renderAction: any) => (
          <Subscribe to={[BeatsContainer, TagsContainer]}>
            {(beats: BeatsContainer, tags: TagsContainer) => (
              <React.Fragment>
                <ConnectedTabs routes={this.props.routes} />
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
