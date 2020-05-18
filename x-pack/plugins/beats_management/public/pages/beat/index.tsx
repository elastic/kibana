/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore
  EuiTab,
  // @ts-ignore
  EuiTabs,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import moment from 'moment';
import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { CMBeat } from '../../../../../legacy/plugins/beats_management/common/domain_types';
import { PrimaryLayout } from '../../components/layouts/primary';
import { Breadcrumb } from '../../components/navigation/breadcrumb';
import { ChildRoutes } from '../../components/navigation/child_routes';
import { AppPageProps } from '../../frontend_types';

interface PageProps extends AppPageProps {
  intl: InjectedIntl;
}
interface PageState {
  beat: CMBeat | undefined;
  beatId: string;
  isLoading: boolean;
}

class BeatDetailsPageComponent extends React.PureComponent<PageProps, PageState> {
  constructor(props: PageProps) {
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

  public renderActionSection(beat?: CMBeat) {
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
        {beat.last_updated && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <FormattedMessage
                id="xpack.beatsManagement.beat.lastConfigUpdateMessage"
                defaultMessage="Last Config Update: {lastUpdateTime}."
                values={{
                  lastUpdateTime: <strong>{moment(beat.last_updated).fromNow()}</strong>,
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

  public render() {
    const { intl } = this.props;
    const { beat } = this.state;
    let id: string | undefined;
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

    return (
      <PrimaryLayout
        title={title}
        actionSection={this.renderActionSection(beat)}
        hideBreadcrumbs={this.props.libs.framework.versionGreaterThen('6.7.0')}
      >
        <React.Fragment>
          <Breadcrumb title={`Enrolled Beats`} path={`/overview/enrolled_beats`} />
          <EuiTabs>
            <EuiTab
              isSelected={`/beat/${id}/details` === this.props.history.location.pathname}
              onClick={this.onTabClicked(`/beat/${id}/details`)}
            >
              <FormattedMessage
                id="xpack.beatsManagement.beat.configTabLabel"
                defaultMessage="Config"
              />
            </EuiTab>
            <EuiTab
              isSelected={`/beat/${id}/tags` === this.props.history.location.pathname}
              onClick={this.onTabClicked(`/beat/${id}/tags`)}
            >
              <FormattedMessage
                id="xpack.beatsManagement.beat.configurationTagsTabLabel"
                defaultMessage="Configuration tags"
              />
            </EuiTab>
          </EuiTabs>
          {!this.state.beat && <div>Beat not found</div>}
          {this.state.beat && (
            <Switch>
              <ChildRoutes
                routes={this.props.routes}
                {...this.props}
                beat={this.state.beat}
                useSwitch={false}
              />
              {id && <Route render={() => <Redirect to={`/beat/${id}/details`} />} />}
            </Switch>
          )}
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

export const BeatDetailsPage = injectI18n(BeatDetailsPageComponent);
