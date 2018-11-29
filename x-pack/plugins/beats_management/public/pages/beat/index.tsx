/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore types for EuiTab not currently available
  EuiTab,
  // @ts-ignore types for EuiTabs not currently available
  EuiTabs,
  EuiText,
} from '@elastic/eui';
import { first, sortByOrder } from 'lodash';
import moment from 'moment';
import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { CMPopulatedBeat } from '../../../common/domain_types';
import { PrimaryLayout } from '../../components/layouts/primary';
import { ChildRoutes } from '../../components/navigation/child_routes';
import { AppPageProps } from '../../frontend_types';

interface PageState {
  beat: CMPopulatedBeat | undefined;
  beatId: string;
  isLoading: boolean;
}

class BeatDetailsPageComponent extends React.PureComponent<AppPageProps, PageState> {
  constructor(props: AppPageProps) {
    super(props);
    this.state = {
      beat: undefined,
      beatId: props.match.params.beatId,
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

  public renderActionSection(beat?: CMPopulatedBeat) {
    return beat ? (
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            Type:&nbsp;
            <strong>{beat.type}</strong>.
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            Version:&nbsp;
            <strong>{beat.version}</strong>.
          </EuiText>
        </EuiFlexItem>
        {beat.full_tags &&
          beat.full_tags.length > 0 && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                Last Config Update:{' '}
                <strong>
                  {moment(
                    first(sortByOrder(beat.full_tags, 'last_updated')).last_updated
                  ).fromNow()}
                </strong>
                .
              </EuiText>
            </EuiFlexItem>
          )}
      </EuiFlexGroup>
    ) : (
      <div>Beat not found</div>
    );
  }

  public render() {
    const { beat } = this.state;
    let id: string | undefined;
    let name;

    if (beat) {
      id = beat.id;
      name = beat.name;
    }
    const title =
      this.state.isLoading && id
        ? 'Loading'
        : `Beat: ${name || 'No name receved from beat'} (id: ${id})`;

    return (
      <PrimaryLayout title={title} actionSection={this.renderActionSection(beat)}>
        <React.Fragment>
          <EuiTabs>
            <EuiTab
              isSelected={`/beat/${id}/details` === this.props.history.location.pathname}
              onClick={this.onTabClicked(`/beat/${id}/details`)}
            >
              Configurations
            </EuiTab>
            <EuiTab
              isSelected={`/beat/${id}/tags` === this.props.history.location.pathname}
              onClick={this.onTabClicked(`/beat/${id}/tags`)}
            >
              Configuration tags
            </EuiTab>
          </EuiTabs>
          <Switch>
            <ChildRoutes
              routes={this.props.routes}
              {...this.props}
              beat={this.state.beat}
              useSwitch={false}
            />
            {id && <Route render={() => <Redirect to={`/beat/${id}/details`} />} />}
          </Switch>
        </React.Fragment>
      </PrimaryLayout>
    );
  }

  private onTabClicked = (path: string) => {
    return () => {
      this.props.goTo(path);
    };
  };

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
export const BeatDetailsPage = BeatDetailsPageComponent;
