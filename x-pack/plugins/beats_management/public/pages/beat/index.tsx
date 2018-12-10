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
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
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
  intl: InjectedIntl;
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

<<<<<<< HEAD
=======
  public renderActionSection(beat?: CMPopulatedBeat) {
    return beat ? (
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <FormattedMessage
              id="xpack.beatsManagement.beat.actionSectionTypeLabel"
              defaultMessage="Type: {beatType}."
              values={{ beatType: <strong>{beat.type}</strong> }}
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <FormattedMessage
              id="xpack.beatsManagement.beat.actionSectionVersionLabel"
              defaultMessage="Version: {beatVersion}."
              values={{ beatVersion: <strong>{beat.version}</strong> }}
            />
          </EuiText>
        </EuiFlexItem>
        {beat.full_tags && beat.full_tags.length > 0 && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <FormattedMessage
                id="xpack.beatsManagement.beat.lastConfigUpdateMessage"
                defaultMessage="Last Config Update: {lastUpdateTime}."
                values={{
                  lastUpdateTime: (
                    <strong>
                      {moment(
                        first(sortByOrder(beat.full_tags, 'last_updated')).last_updated
                      ).fromNow()}
                    </strong>
                  ),
                }}
              />
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    ) : (
      <FormattedMessage
        id="xpack.beatsManagement.beat.beatNotFoundMessage"
        defaultMessage="Beat not found"
      />
    );
  }

>>>>>>> 45a67701f2... Upgrade to NodeJS 10 (#25157)
  public render() {
    const { intl } = this.props;
    const { beat } = this.state;
    let id;
    let name;

    if (beat) {
      id = beat.id;
      name = beat.name;
    }
    const title = this.state.isLoading
      ? intl.formatMessage({
          id: 'xpack.beatsManagement.beat.loadingTitle',
          defaultMessage: 'Loading',
        })
      : intl.formatMessage(
          {
            id: 'xpack.beatsManagement.beat.beatNameAndIdTitle',
            defaultMessage: 'Beat: {nameOrNoName} (id: {id})',
          },
          {
            nameOrNoName:
              name ||
              intl.formatHTMLMessage({
                id: 'xpack.beatsManagement.beat.noNameReceivedFromBeatTitle',
                defaultMessage: 'No name received from beat',
              }),
            id,
          }
        );

    const tabs = [
      {
        id: `/beat/${id}`,
        name: intl.formatMessage({
          id: 'xpack.beatsManagement.beat.configTabLabel',
          defaultMessage: 'Config',
        }),
        disabled: false,
      },
      // {
      //   id: `/beat/${id}/activity`,
      //   name: 'Beat Activity',
      //   disabled: false,
      // },
      {
        id: `/beat/${id}/tags`,
        name: intl.formatMessage({
          id: 'xpack.beatsManagement.beat.configurationTagsTabLabel',
          defaultMessage: 'Configuration Tags',
        }),
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
    const { intl } = this.props;
    const { beatId } = this.props.match.params;
    let beat;
    try {
      beat = await this.props.libs.beats.get(beatId);
      if (!beat) {
        throw new Error(
          intl.formatMessage({
            id: 'xpack.beatsManagement.beat.beatNotFoundErrorMessage',
            defaultMessage: 'beat not found',
          })
        );
      }
    } catch (e) {
      throw new Error(e);
    }
    this.setState({ beat, isLoading: false });
  }
}
const BeatDetailsPageUi = withUrlState<BeatDetailsPageProps>(BeatDetailsPageComponent);

export const BeatDetailsPage = injectI18n(BeatDetailsPageUi);
