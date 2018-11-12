/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import {
//   // @ts-ignore
//   EuiTab,
//   // @ts-ignore
//   EuiTabs,
// } from '@elastic/eui';
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

  public componentDidMount() {
    this.loadBeats();
  }

  public render() {
    // TODO move check and redirect to router
    // if (
    //   this.state.loadedBeatsAtLeastOnce &&
    //   this.state.unfilteredBeats.length === 0 &&
    //   !this.props.location.pathname.includes('/overview/initial')
    // ) {
    //   return <Redirect to="/overview/initial/help" />;
    // }

    // TODO add tabs
    // const renderedTabs = tabs.map((tab, index) => (
    //   <EuiTab
    //     onClick={() => this.onSelectedTabChanged(tab.id)}
    //     isSelected={tab.id === this.props.location.pathname}
    //     disabled={tab.disabled}
    //     key={index}
    //   >
    //     {tab.name}
    //   </EuiTab>
    // ));

    // TODO add action area
    // actionSection={
    //   <Switch>
    //     <Route
    //       path="/overview/beats/:action?/:enrollmentToken?"
    //       render={(props: any) => (
    //         <BeatsPage.ActionArea {...this.props} {...props} libs={this.props.libs} />
    //       )}
    //     />
    //     <Route
    //       path="/overview/tags"
    //       render={(props: any) => (
    //         <TagsPage.ActionArea {...this.props} {...props} libs={this.props.libs} />
    //       )}
    //     />
    //   </Switch>
    // }

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

  // private loadBeats = async () => {
  //   let query;
  //   if (this.props.urlState.beatsKBar) {
  //     query = await this.props.libs.elasticsearch.convertKueryToEsQuery(
  //       this.props.urlState.beatsKBar
  //     );
  //   }

  //   let beats: CMPopulatedBeat[];
  //   let unfilteredBeats: CMPopulatedBeat[];
  //   try {
  //     [beats, unfilteredBeats] = await Promise.all([
  //       this.props.libs.beats.getAll(query),
  //       this.props.libs.beats.getAll(),
  //     ]);
  //   } catch (e) {
  //     beats = [];
  //     unfilteredBeats = [];
  //   }
  //   if (this.mounted) {
  //     this.setState({
  //       loadedBeatsAtLeastOnce: true,
  //       beats,
  //       unfilteredBeats,
  //     });
  //   }
  // };
}

export const MainPage = withUrlState<MainPagesProps>(MainPageComponent);
