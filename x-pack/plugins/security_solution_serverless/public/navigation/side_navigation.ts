/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { GroupDefinition } from '@kbn/core-chrome-browser';
import produce from 'immer';
import { map } from 'rxjs';
import { type Services } from '../common/services';

const PROJECT_SETTINGS_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.navLinks.projectSettings.title',
  { defaultMessage: 'Project Settings' }
);

export const initSideNavigation = (services: Services) => {
  services.securitySolution.setIsSolutionNavigationEnabled(true);

  const { navigationTree$, panelContentProvider } =
    services.securitySolution.getSolutionNavigation();

  const serverlessNavigationTree$ = navigationTree$.pipe(
    map((navigationTree) =>
      produce(navigationTree, (draft) => {
        // Adds serverless cloud links to the footer group ("Product settings" dropdown)
        const footerGroup: GroupDefinition | undefined = draft.footer?.find(
          ({ type }) => type === 'navGroup'
        ) as GroupDefinition;
        if (footerGroup) {
          footerGroup.title = PROJECT_SETTINGS_TITLE;
          footerGroup.children.push(
            { cloudLink: 'userAndRoles', openInNewTab: true },
            { cloudLink: 'billingAndSub', openInNewTab: true }
          );
        }
      })
    )
  );

  services.serverless.initNavigation('security', serverlessNavigationTree$, {
    panelContentProvider,
    dataTestSubj: 'securitySolutionSideNav',
  });
};
