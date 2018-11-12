/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { CMPopulatedBeat } from '../../../common/domain_types';
import { PrimaryLayout } from '../../components/layouts/primary';
import { ChildRoutes } from '../../components/navigation/child_routes';
import { ConnectedTabs } from '../../components/navigation/connected_tabs';
import { URLStateProps, withUrlState } from '../../containers/with_url_state';
import { AppURLState } from '../../frontend_types';
import { FrontendLibs } from '../../lib/types';

interface RouteConfig {
  path: string;
  component: React.ComponentType<any>;
  routes?: RouteConfig[];
}
interface MainPagesProps extends URLStateProps<AppURLState> {
  libs: FrontendLibs;
  routes: RouteConfig[];
  location: any;
}

interface MainPagesState {
  enrollBeat?: {
    enrollmentToken: string;
  } | null;
  beats: CMPopulatedBeat[];
  loadedBeatsAtLeastOnce: boolean;
}

class MainPageComponent extends React.PureComponent<MainPagesProps, MainPagesState> {
  constructor(props: MainPagesProps) {
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
          <React.Fragment>
            <ConnectedTabs routes={this.props.routes} tabs={[{ path: '', name: '' }]} />
            <ChildRoutes routes={this.props.routes} renderAction={renderAction} {...this.props} />
          </React.Fragment>
        )}
      </PrimaryLayout>
    );
  }
}

export const MainPage = withUrlState<MainPagesProps>(MainPageComponent);
