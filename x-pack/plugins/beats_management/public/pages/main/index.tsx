/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiTab,
  // @ts-ignore
  EuiTabs,
} from '@elastic/eui';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { CMPopulatedBeat } from '../../../common/domain_types';
import { AppURLState } from '../../app';
import { ConnectedLink } from '../../components/connected_link';
import { NoDataLayout } from '../../components/layouts/no_data';
import { PrimaryLayout } from '../../components/layouts/primary';
import { WalkthroughLayout } from '../../components/layouts/walkthrough';
import { RouteWithBreadcrumb } from '../../components/route_with_breadcrumb';
import { URLStateProps, withUrlState } from '../../containers/with_url_state';
import { FrontendLibs } from '../../lib/lib';
import { ActivityPage } from './activity';
import { BeatsPage } from './beats';
import { CreateTagPageFragment } from './create_tag_fragment';
import { EnrollBeatPage } from './enroll_fragment';
import { FinishWalkthroughPage } from './finish_walkthrough';
import { TagsPage } from './tags';

interface MainPagesProps extends URLStateProps<AppURLState> {
  libs: FrontendLibs;
  location: any;
  intl: InjectedIntl;
}

interface MainPagesState {
  enrollBeat?: {
    enrollmentToken: string;
  } | null;
  beats: CMPopulatedBeat[];
  unfilteredBeats: CMPopulatedBeat[];
  loadedBeatsAtLeastOnce: boolean;
}

class MainPagesComponent extends React.PureComponent<MainPagesProps, MainPagesState> {
  private mounted: boolean = false;

  constructor(props: MainPagesProps) {
    super(props);
    this.state = {
      loadedBeatsAtLeastOnce: false,
      beats: [],
      unfilteredBeats: [],
    };
  }
  public onSelectedTabChanged = (id: string) => {
    this.props.goTo(id);
  };

  public componentDidMount() {
    this.mounted = true;
    this.loadBeats();
  }

  public componentWillUnmount() {
    this.mounted = false;
  }

  public render() {
    const { intl } = this.props;
    if (
      this.state.loadedBeatsAtLeastOnce &&
      this.state.unfilteredBeats.length === 0 &&
      !this.props.location.pathname.includes('/overview/initial')
    ) {
      return <Redirect to="/overview/initial/help" />;
    }
    const tabs = [
      {
        id: '/overview/beats',
        name: (
          <FormattedMessage
            id="xpack.beatsManagement.beats.enrolledBeatsTabTitle"
            defaultMessage="Enrolled Beats"
          />
        ),
        disabled: false,
      },
      // {
      //   id: '/overview/activity',
      //   name: 'Beats Activity',
      //   disabled: false,
      // },
      {
        id: '/overview/tags',
        name: (
          <FormattedMessage
            id="xpack.beatsManagement.beats.configurationTagsTabTitle"
            defaultMessage="Configuration tags"
          />
        ),
        disabled: false,
      },
    ];

    const walkthroughSteps = [
      {
        id: '/overview/initial/beats',
        name: intl.formatMessage({
          id: 'xpack.beatsManagement.enrollBeat.enrollBeatStepLabel',
          defaultMessage: 'Enroll Beat',
        }),
        // name: (
        //   <FormattedMessage
        //     id="xpack.beatsManagement.initialMainPages.enrollBeatName"
        //     defaultMessage="Enroll Beat"
        //   />
        // ),
        disabled: false,
        page: EnrollBeatPage,
      },
      {
        id: '/overview/initial/tag',
        name: intl.formatMessage({
          id: 'xpack.beatsManagement.enrollBeat.createTagStepLabel',
          defaultMessage: 'Create tag',
        }),
        disabled: false,
        page: CreateTagPageFragment,
      },
      {
        id: '/overview/initial/finish',
        name: intl.formatMessage({
          id: 'xpack.beatsManagement.enrollBeat.finishStepLabel',
          defaultMessage: 'finish',
        }),
        disabled: false,
        page: FinishWalkthroughPage,
      },
    ];

    if (this.props.location.pathname === '/overview/initial/help') {
      return (
        <NoDataLayout
          title={intl.formatMessage({
            id: 'xpack.beatsManagement.enrollBeat.beatsCentralManagementTitle',
            defaultMessage: 'Beats central management',
          })}
          actionSection={
            <ConnectedLink path="/overview/initial/beats">
              <EuiButton color="primary" fill>
                <FormattedMessage
                  id="xpack.beatsManagement.enrollBeat.enrollBeatButtonLabel"
                  defaultMessage="Enroll Beat"
                />
              </EuiButton>
            </ConnectedLink>
          }
        >
          <p>
            <FormattedMessage
              id="xpack.beatsManagement.enrollBeat.beatsCentralManagementDescription"
              defaultMessage="Manage your configurations in a central location."
            />
          </p>
        </NoDataLayout>
      );
    }

    if (this.props.location.pathname.includes('/overview/initial')) {
      return (
        <WalkthroughLayout
          title={intl.formatMessage({
            id: 'xpack.beatsManagement.enrollBeat.getStartedBeatsCentralManagementTitle',
            defaultMessage: 'Get started with Beats central management',
          })}
          walkthroughSteps={walkthroughSteps}
          goTo={this.props.goTo}
          activePath={this.props.location.pathname}
        >
          <Switch>
            {walkthroughSteps.map(step => (
              <Route
                path={step.id}
                render={(props: any) => (
                  <step.page
                    {...this.props}
                    {...props}
                    libs={this.props.libs}
                    loadBeats={this.loadBeats}
                  />
                )}
              />
            ))}
          </Switch>
        </WalkthroughLayout>
      );
    }

    const renderedTabs = tabs.map((tab, index) => (
      <EuiTab
        onClick={() => this.onSelectedTabChanged(tab.id)}
        isSelected={tab.id === this.props.location.pathname}
        disabled={tab.disabled}
        key={index}
      >
        {tab.name}
      </EuiTab>
    ));

    return (
      <PrimaryLayout
        title={intl.formatMessage({
          id: 'xpack.beatsManagement.beatsRouteTitle',
          defaultMessage: 'Beats',
        })}
        actionSection={
          <Switch>
            <Route
              path="/overview/beats/:action?/:enrollmentToken?"
              render={(props: any) => (
                <BeatsPage.ActionArea {...this.props} {...props} libs={this.props.libs} />
              )}
            />
            <Route
              path="/overview/tags"
              render={(props: any) => (
                <TagsPage.ActionArea {...this.props} {...props} libs={this.props.libs} />
              )}
            />
          </Switch>
        }
      >
        <EuiTabs>{renderedTabs}</EuiTabs>

        <RouteWithBreadcrumb
          title={intl.formatMessage({
            id: 'xpack.beatsManagement.beatsListRouteTitle',
            defaultMessage: 'Beats List',
          })}
          path="/overview/beats/:action?/:enrollmentToken?"
          render={(props: any) => (
            <BeatsPage
              {...this.props}
              libs={this.props.libs}
              {...props}
              loadBeats={this.loadBeats}
              beats={this.state.beats}
            />
          )}
        />
        <RouteWithBreadcrumb
          title={intl.formatMessage({
            id: 'xpack.beatsManagement.activityOverviewRouteTitle',
            defaultMessage: 'Activity Overview',
          })}
          path="/overview/activity"
          exact={true}
          render={(props: any) => (
            <ActivityPage {...this.props} libs={this.props.libs} {...props} />
          )}
        />
        <RouteWithBreadcrumb
          title={intl.formatMessage({
            id: 'xpack.beatsManagement.tagsListRouteTitle',
            defaultMessage: 'Tags List',
          })}
          path="/overview/tags"
          exact={true}
          render={(props: any) => <TagsPage {...this.props} libs={this.props.libs} {...props} />}
        />
      </PrimaryLayout>
    );
  }

  private loadBeats = async () => {
    let query;
    if (this.props.urlState.beatsKBar) {
      query = await this.props.libs.elasticsearch.convertKueryToEsQuery(
        this.props.urlState.beatsKBar
      );
    }

    let beats: CMPopulatedBeat[];
    let unfilteredBeats: CMPopulatedBeat[];
    try {
      [beats, unfilteredBeats] = await Promise.all([
        this.props.libs.beats.getAll(query),
        this.props.libs.beats.getAll(),
      ]);
    } catch (e) {
      beats = [];
      unfilteredBeats = [];
    }
    if (this.mounted) {
      this.setState({
        loadedBeatsAtLeastOnce: true,
        beats,
        unfilteredBeats,
      });
    }
  };
}

const MainPagesUI = withUrlState<MainPagesProps>(MainPagesComponent);

export const MainPages = injectI18n(MainPagesUI);
