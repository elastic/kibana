/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiSpacer,
  // @ts-ignore types for EuiTab not currently available
  EuiTab,
  // @ts-ignore types for EuiTabs not currently available
  EuiTabs,
} from '@elastic/eui';
import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { CMPopulatedBeat } from '../../../common/domain_types';
import { AppURLState } from '../../app';
import { PrimaryLayout } from '../../components/layouts/primary';
import { URLStateProps, withUrlState } from '../../containers/with_url_state';
import { FrontendLibs } from '../../lib/lib';
import { BeatDetailsActionSection } from './action_section';
import { BeatActivityPage } from './activity';
import { BeatDetailPage } from './detail';
import { BeatTagsPage } from './tags';

interface Match {
  params: any;
}

interface BeatDetailsPageProps extends URLStateProps<AppURLState> {
  location: any;
  history: any;
  libs: FrontendLibs;
  match: Match;
}

interface BeatDetailsPageState {
  beat: CMPopulatedBeat | undefined;
  beatId: string;
  isLoading: boolean;
}

class BeatDetailsPageComponent extends React.PureComponent<
  BeatDetailsPageProps,
  BeatDetailsPageState
> {
  constructor(props: BeatDetailsPageProps) {
    super(props);

    this.state = {
      beat: undefined,
      beatId: this.props.match.params.beatId,
      isLoading: true,
    };
    this.loadBeat();
  }

  public onSelectedTabChanged = (id: string) => {
    this.props.history.push({
      pathname: id,
      search: this.props.location.search,
    });
  };

  public render() {
    const { beat } = this.state;
    let id;
    let name;

    if (beat) {
      id = beat.id;
      name = beat.name;
    }
    const title = this.state.isLoading
      ? 'Loading'
      : `Beat: ${name || 'No name receved from beat'} (id: ${id})`;

    const tabs = [
      {
        id: `/beat/${id}`,
        name: 'Config',
        disabled: false,
      },
      // {
      //   id: `/beat/${id}/activity`,
      //   name: 'Beat Activity',
      //   disabled: false,
      // },
      {
        id: `/beat/${id}/tags`,
        name: 'Configuration Tags',
        disabled: false,
      },
    ];

    return (
      <PrimaryLayout title={title} actionSection={<BeatDetailsActionSection beat={beat} />}>
        <EuiTabs>
          {tabs.map((tab, index) => (
            <EuiTab
              disabled={tab.disabled}
              key={index}
              isSelected={tab.id === this.props.history.location.pathname}
              onClick={() => {
                this.props.history.push({
                  pathname: tab.id,
                  search: this.props.location.search,
                });
              }}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>
        <EuiSpacer size="l" />
        <Switch>
          <Route
            path="/beat/:beatId/activity"
            render={(props: any) => <BeatActivityPage libs={this.props.libs} {...props} />}
          />
          <Route
            path="/beat/:beatId/tags"
            render={(props: any) => (
              <BeatTagsPage
                beatId={this.state.beatId}
                libs={this.props.libs}
                refreshBeat={() => this.loadBeat()}
                {...props}
              />
            )}
          />
          <Route
            path="/beat/:beatId"
            render={(props: any) => (
              <BeatDetailPage beat={this.state.beat} libs={this.props.libs} {...props} />
            )}
          />
        </Switch>
      </PrimaryLayout>
    );
  }

  private async loadBeat() {
    const { beatId } = this.props.match.params;
    let beat;
    try {
      beat = await this.props.libs.beats.get(beatId);
      if (!beat) {
        throw new Error('beat not found');
      }
    } catch (e) {
      throw new Error(e);
    }
    this.setState({ beat, isLoading: false });
  }
}
export const BeatDetailsPage = withUrlState<BeatDetailsPageProps>(BeatDetailsPageComponent);
