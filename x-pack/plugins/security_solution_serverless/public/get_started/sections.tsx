/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { SyntheticEvent } from 'react';

import type { IBasePath, NavigateToUrlOptions } from '@kbn/core/public';

import {
  SectionId,
  GetMoreFromElasticSecurityCardId,
  GetSetUpCardId,
  IntroductionSteps,
  type Section,
  ConfigureSteps,
  BadgeId,
  ExploreSteps,
  MasterTheInvestigationsWorkflowSteps,
  RespondToThreatsSteps,
  OptimizeYourWorkSpaceSteps,
} from './types';
import * as i18n from './translations';
import respond from './images/respond.svg';
import explore from './images/explore.svg';
import { ProductLine } from '../../common/product';
import { FleetOverviewLink } from './step_links/fleet_overview_link';
import { EndpointManagementLink } from './step_links/endpoint_management_link';
import { IntegrationsLink } from './step_links/integrations_link';
import { RulesManagementLink } from './step_links/rules_management_link';
import { OverviewLink } from './step_links/overview_link';
import { AlertsLink } from './step_links/alerts_link';
import { ExploreLink } from './step_links/explore_link';

const analyticsBadge = {
  id: BadgeId.analytics,
  name: i18n.PRODUCT_BADGE_ANALYTICS,
};

const cloudBadge = {
  id: BadgeId.cloud,
  name: i18n.PRODUCT_BADGE_CLOUD,
};

const edrBadge = {
  id: BadgeId.edr,
  name: i18n.PRODUCT_BADGE_EDR,
};

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
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin"
        scrolling="no"
        src="//play.vidyard.com/K6kKDBbP9SpXife9s2tHNP.html?"
        title={i18n.WATCH_OVERVIEW_VIDEO_HEADER}
        width="100%"
      />
    ),
    timeInMinutes: 3,
    badges: [analyticsBadge, cloudBadge, edrBadge],
  },
];

const configureSteps = [
  {
    id: ConfigureSteps.learnAbout,
    title: i18n.CONFIGURE_STEP1,
    description: [<FleetOverviewLink />],
    badges: [analyticsBadge, cloudBadge, edrBadge],
  },
  {
    id: ConfigureSteps.deployElasticAgent,
    title: i18n.CONFIGURE_STEP2,
    badges: [analyticsBadge, cloudBadge, edrBadge],
    description: [i18n.CONFIGURE_STEP2_DESCRIPTION1, <EndpointManagementLink />],
  },
  {
    id: ConfigureSteps.connectToDataSources,
    title: i18n.CONFIGURE_STEP3,
    badges: [analyticsBadge],
    description: [i18n.CONFIGURE_STEP3_DESCRIPTION1, <IntegrationsLink />],
    productLineRequired: [ProductLine.security],
  },
  {
    id: ConfigureSteps.enablePrebuiltRules,
    title: i18n.CONFIGURE_STEP4,
    badges: [analyticsBadge, cloudBadge, edrBadge],
    description: [i18n.CONFIGURE_STEP4_DESCRIPTION1, <RulesManagementLink />],
  },
];

const exploreSteps = [
  {
    id: ExploreSteps.viewAlerts,
    title: i18n.EXPLORE_STEP1,
    badges: [analyticsBadge, cloudBadge, edrBadge],
    description: [i18n.EXPLORE_STEP1_DESCRIPTION1, <AlertsLink />],
  },
  {
    id: ExploreSteps.analyzeData,
    title: i18n.EXPLORE_STEP2,
    badges: [analyticsBadge, cloudBadge, edrBadge],
    description: [<OverviewLink />, <ExploreLink />],
  },
];

const masterTheInvestigationsWorkflowSteps = [
  {
    id: MasterTheInvestigationsWorkflowSteps.introductionToInvestigations,
    title: i18n.MASTER_THE_INVESTIGATION_STEP1,
    badges: [analyticsBadge, cloudBadge, edrBadge],
  },
  {
    id: MasterTheInvestigationsWorkflowSteps.exploreProcess,
    title: i18n.MASTER_THE_INVESTIGATION_STEP2,
    badges: [cloudBadge, edrBadge],
    productLineRequired: [ProductLine.cloud, ProductLine.endpoint],
  },
  {
    id: MasterTheInvestigationsWorkflowSteps.exploreUser,
    title: i18n.MASTER_THE_INVESTIGATION_STEP3,
    badges: [cloudBadge, edrBadge],
    productLineRequired: [ProductLine.cloud, ProductLine.endpoint],
  },
  {
    id: MasterTheInvestigationsWorkflowSteps.exploreThreatHunting,
    title: i18n.MASTER_THE_INVESTIGATION_STEP4,
    badges: [analyticsBadge, cloudBadge, edrBadge],
  },
  {
    id: MasterTheInvestigationsWorkflowSteps.introductionToCases,
    title: i18n.MASTER_THE_INVESTIGATION_STEP5,
    badges: [analyticsBadge, cloudBadge, edrBadge],
  },
];

const respondToThreatsSteps = [
  {
    id: RespondToThreatsSteps.automated,
    title: i18n.RESPOND_TO_THREATS_STEP1,
    badges: [edrBadge],
    productLineRequired: [ProductLine.endpoint],
  },
  {
    id: RespondToThreatsSteps.takeControlOfEndpoint,
    title: i18n.RESPOND_TO_THREATS_STEP2,
    badges: [edrBadge],
    productLineRequired: [ProductLine.endpoint],
  },
];

const optimizeYourWorkSpaceSteps = [
  {
    id: OptimizeYourWorkSpaceSteps.enableThreatIntelligence,
    title: i18n.OPTIMIZE_YOUR_WORKSPACE_STEP1,
    badges: [analyticsBadge, cloudBadge, edrBadge],
  },
  {
    id: OptimizeYourWorkSpaceSteps.enableEntityAnalytics,
    title: i18n.OPTIMIZE_YOUR_WORKSPACE_STEP2,
    badges: [analyticsBadge, cloudBadge, edrBadge],
  },
  {
    id: OptimizeYourWorkSpaceSteps.createCustomRules,
    title: i18n.OPTIMIZE_YOUR_WORKSPACE_STEP3,
    badges: [analyticsBadge, cloudBadge, edrBadge],
  },
  {
    id: OptimizeYourWorkSpaceSteps.introductionToExceptions,
    title: i18n.OPTIMIZE_YOUR_WORKSPACE_STEP4,
    badges: [analyticsBadge, cloudBadge, edrBadge],
  },
  {
    id: OptimizeYourWorkSpaceSteps.connectNotification,
    title: i18n.OPTIMIZE_YOUR_WORKSPACE_STEP5,
    badges: [analyticsBadge, cloudBadge, edrBadge],
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
  {
    id: SectionId.getMoreFromElasticSecurity,
    title: i18n.GET_MORE_TITLE,
    cards: [
      {
        icon: { type: 'advancedSettingsApp', size: 'xl' },
        title: i18n.MASTER_THE_INVESTIGATION_TITLE,
        id: GetMoreFromElasticSecurityCardId.masterTheInvestigationsWorkflow,
        steps: masterTheInvestigationsWorkflowSteps,
      },
      {
        icon: { type: respond, size: 'xl' },
        title: i18n.RESPOND_TO_THREATS_TITLE,
        id: GetMoreFromElasticSecurityCardId.respondToThreats,
        steps: respondToThreatsSteps,
      },
      {
        icon: { type: 'spacesApp', size: 'xl' },
        title: i18n.OPTIMIZE_YOUR_WORKSPACE_TITLE,
        id: GetMoreFromElasticSecurityCardId.optimizeYourWorkSpace,
        steps: optimizeYourWorkSpaceSteps,
      },
    ],
  },
];

export const getSections = () => sections;
