/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore types for EuiTab and EuiTabs not currently available
import { EuiFlexGroup, EuiFlexItem, EuiTab, EuiTabs, EuiText } from '@elastic/eui';
import moment from 'moment';
import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { CMPopulatedBeat } from '../../../common/domain_types';
import { BeatActivityView, BeatDetailView, BeatTagsView } from '../../components/beat';
import { PrimaryLayout } from '../../components/layouts/primary';
import { FrontendLibs } from '../../lib/lib';

interface Match {
  params: any;
}

interface BeatDetailsPageProps {
  history: any;
  libs: FrontendLibs;
  match: Match;
}

interface BeatDetailsPageState {
  beat: CMPopulatedBeat | undefined;
  isLoading: boolean;
}

export class BeatDetailsPage extends React.PureComponent<
  BeatDetailsPageProps,
  BeatDetailsPageState
> {
  constructor(props: BeatDetailsPageProps) {
    super(props);

    this.state = {
      beat: undefined,
      isLoading: true,
    };
    this.loadBeat();
  }

  public onSelectedTabChanged = (id: string) => {
    this.props.history.push(id);
  };

  public render() {
    const { beat } = this.state;
    let id;
    let version: string | undefined;
    let lastUpdated: string | undefined;

    if (beat) {
      id = beat.id;
      version = beat.version;
      lastUpdated = beat.last_updated;
    }
    const title = this.state.isLoading ? 'Loading' : `Beat: ${id}`;
    const tabs = [
      {
        id: `/beat/${id}`,
        name: 'Config',
        disabled: false,
      },
      {
        id: `/beat/${id}/activity`,
        name: 'Activity',
        disabled: false,
      },
      {
        id: `/beat/${id}/tags`,
        name: 'Tags',
        disabled: false,
      },
    ];

    return (
      <PrimaryLayout
        title={title}
        actionSection={
          <div>
            {beat ? (
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    Version:&nbsp;
                    {version}.
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {/* TODO: What field is used to populate this value? */}
                  <EuiText size="xs">Uptime: 12min.</EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">Last Config Update: {moment(lastUpdated).fromNow()}</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <div>Beat not found</div>
            )}
          </div>
        }
      >
        <EuiTabs>
          {tabs.map((tab, index) => (
            <EuiTab
              disabled={tab.disabled}
              key={index}
              isSelected={tab.id === this.props.history.location.pathname}
              onClick={() => {
                this.props.history.push(tab.id);
              }}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>
        <Switch>
          <Route path="/beat/:beatId/activity" render={(props: any) => <BeatActivityView />} />
          <Route path="/beat/:beatId/tags" render={(props: any) => <BeatTagsView />} />
          <Route
            path="/beat/:beatId"
            render={(props: any) => <BeatDetailView beat={this.state.beat} />}
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
