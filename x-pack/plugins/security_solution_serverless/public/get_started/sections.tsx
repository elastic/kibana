/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import {
  SectionId,
  GetSetUpCardId,
  IntroductionSteps,
  type Section,
  ConfigureSteps,
  ExploreSteps,
} from './types';
import * as i18n from './translations';
import explore from './images/explore.svg';
import { ProductLine } from '../../common/product';
import { FleetOverviewLink } from './step_links/fleet_overview_link';
import { EndpointManagementLink } from './step_links/endpoint_management_link';
import { IntegrationsLink } from './step_links/integrations_link';
import { RulesManagementLink } from './step_links/rules_management_link';
import { OverviewLink } from './step_links/overview_link';
import { AlertsLink } from './step_links/alerts_link';
import { ExploreLink } from './step_links/explore_link';
import connectToDataSources from './images/connect_to_existing_sources.png';
import endalbePrebuiltRules from './images/enable_prebuilt_rules.png';
import deployElasticAgent from './images/deploy_elastic_agent_to_protect_your_endpoint.png';
import learnAboutElasticAgent from './images/learn_about_elastic_agent.png';
import viewAlerts from './images/view_alerts.png';
import analyzeDataUsingDashboards from './images/analyze_data_using_dashboards.png';

export const RIGHT_CONTENT_HEIGHT = 270;
export const RIGHT_CONTENT_WIDTH = 480;

export const introductionSteps = [
  {
    id: IntroductionSteps.getToKnowElasticSecurity,
    title: i18n.INTRODUCTION_STEP1,
    description: [i18n.INTRODUCTION_STEP1_DESCRIPTION1, i18n.INTRODUCTION_STEP1_DESCRIPTION2],
    splitPanel: (
      <iframe
        allowFullScreen
        className="vidyard_iframe"
        frameBorder="0"
        height="100%"
        width="100%"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin"
        scrolling="no"
        src="//play.vidyard.com/K6kKDBbP9SpXife9s2tHNP.html?"
        title={i18n.WATCH_OVERVIEW_VIDEO_HEADER}
      />
    ),
    timeInMinutes: 3,
  },
];

const configureSteps = [
  {
    id: ConfigureSteps.learnAbout,
    title: i18n.CONFIGURE_STEP1,
    description: [<FleetOverviewLink />],
    splitPanel: (
      <img src={learnAboutElasticAgent} alt={i18n.CONFIGURE_STEP1} height="100%" width="100%" />
    ),
  },
  {
    id: ConfigureSteps.deployElasticAgent,
    title: i18n.CONFIGURE_STEP2,
    description: [i18n.CONFIGURE_STEP2_DESCRIPTION1, <EndpointManagementLink />],
    splitPanel: (
      <img src={deployElasticAgent} alt={i18n.CONFIGURE_STEP2} height="100%" width="100%" />
    ),
  },
  {
    id: ConfigureSteps.connectToDataSources,
    title: i18n.CONFIGURE_STEP3,
    description: [i18n.CONFIGURE_STEP3_DESCRIPTION1, <IntegrationsLink />],
    productLineRequired: [ProductLine.security],
    splitPanel: (
      <img src={connectToDataSources} alt={i18n.CONFIGURE_STEP3} height="100%" width="100%" />
    ),
  },
  {
    id: ConfigureSteps.enablePrebuiltRules,
    title: i18n.CONFIGURE_STEP4,
    description: [i18n.CONFIGURE_STEP4_DESCRIPTION1, <RulesManagementLink />],
    splitPanel: (
      <img src={endalbePrebuiltRules} alt={i18n.CONFIGURE_STEP4} height="100%" width="100%" />
    ),
  },
];

const exploreSteps = [
  {
    id: ExploreSteps.viewAlerts,
    title: i18n.EXPLORE_STEP1,
    description: [i18n.EXPLORE_STEP1_DESCRIPTION1, <AlertsLink />],
    splitPanel: <img src={viewAlerts} alt={i18n.EXPLORE_STEP1} height="100%" width="100%" />,
  },
  {
    id: ExploreSteps.analyzeData,
    title: i18n.EXPLORE_STEP2,
    description: [<OverviewLink />, <ExploreLink />],
    splitPanel: (
      <img src={analyzeDataUsingDashboards} alt={i18n.EXPLORE_STEP2} height="100%" width="100%" />
    ),
  },
];

export const sections: Section[] = [
  {
    id: SectionId.getSetUp,
    title: i18n.GET_SET_UP_TITLE,
    cards: [
      {
        title: i18n.INTRODUCTION_TITLE,
        icon: { type: 'securityApp', size: 'xl' },
        id: GetSetUpCardId.introduction,
        steps: introductionSteps,
      },
      {
        icon: { type: 'agentApp', size: 'xl' },
        title: i18n.CONFIGURE_TITLE,
        id: GetSetUpCardId.configure,
        steps: configureSteps,
      },
      {
        icon: { type: explore, size: 'xl' },
        title: i18n.EXPLORE_TITLE,
        id: GetSetUpCardId.explore,
        steps: exploreSteps,
      },
    ],
  },
];

export const getSections = () => sections;
