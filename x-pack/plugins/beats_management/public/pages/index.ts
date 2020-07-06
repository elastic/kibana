/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BeatDetailPage } from './beat/details';
import { BeatDetailsPage } from './beat/index';
import { BeatTagsPage } from './beat/tags';
import { EnforceSecurityPage } from './error/enforce_security';
import { InvalidLicensePage } from './error/invalid_license';
import { NoAccessPage } from './error/no_access';
import { TagsPage } from './overview/configuration_tags';
import { BeatsPage } from './overview/enrolled_beats';
import { MainPage } from './overview/index';
import { TagCreatePage } from './tag/create';
import { TagEditPage } from './tag/edit';
import { BeatsInitialEnrollmentPage } from './walkthrough/initial/beat';
import { FinishWalkthroughPage } from './walkthrough/initial/finish';
import { InitialWalkthroughPage } from './walkthrough/initial/index';
import { InitialTagPage } from './walkthrough/initial/tag';

export const routeMap = [
  { path: '/tag/create/:tagid?', component: TagCreatePage },
  { path: '/tag/edit/:tagid?', component: TagEditPage },
  {
    path: '/beat/:beatId',
    component: BeatDetailsPage,
    routes: [
      { path: '/beat/:beatId/details', component: BeatDetailPage },
      { path: '/beat/:beatId/tags', component: BeatTagsPage },
    ],
  },
  { path: '/error/enforce_security', component: EnforceSecurityPage },
  { path: '/error/invalid_license', component: InvalidLicensePage },
  { path: '/error/no_access', component: NoAccessPage },
  {
    path: '/overview',
    component: MainPage,
    routes: [
      { path: '/overview/configuration_tags', component: TagsPage },
      { path: '/overview/enrolled_beats', component: BeatsPage },
    ],
  },
  {
    path: '/walkthrough/initial',
    component: InitialWalkthroughPage,
    routes: [
      { path: '/walkthrough/initial/beat', component: BeatsInitialEnrollmentPage },
      { path: '/walkthrough/initial/finish', component: FinishWalkthroughPage },
      { path: '/walkthrough/initial/tag', component: InitialTagPage },
    ],
  },
];
