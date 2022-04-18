/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import { AppNavLinkStatus, AppUpdater, ApplicationStart, AppDeepLink } from '@kbn/core/public';
import { CasesDeepLinkId } from '@kbn/cases-plugin/public';
import { ConfigSchema } from '.';
import { casesFeatureId } from '../common';

export function updateGlobalNavigation({
  capabilities,
  config,
  deepLinks,
  updater$,
}: {
  capabilities: ApplicationStart['capabilities'];
  config: ConfigSchema;
  deepLinks: AppDeepLink[];
  updater$: Subject<AppUpdater>;
}) {
  const { apm, logs, metrics, uptime } = capabilities.navLinks;
  const someVisible = Object.values({ apm, logs, metrics, uptime }).some((visible) => visible);

  const updatedDeepLinks = deepLinks.map((link) => {
    switch (link.id) {
      case CasesDeepLinkId.cases:
        return {
          ...link,
          navLinkStatus:
            config.unsafe.cases.enabled && capabilities[casesFeatureId].read_cases && someVisible
              ? AppNavLinkStatus.visible
              : AppNavLinkStatus.hidden,
        };
      case 'alerts':
        return {
          ...link,
          navLinkStatus:
            config.unsafe.alertingExperience.enabled && someVisible
              ? AppNavLinkStatus.visible
              : AppNavLinkStatus.hidden,
        };
      case 'rules':
        return {
          ...link,
          navLinkStatus:
            config.unsafe.rules.enabled && someVisible
              ? AppNavLinkStatus.visible
              : AppNavLinkStatus.hidden,
        };
      default:
        return link;
    }
  });

  updater$.next(() => ({
    deepLinks: updatedDeepLinks,
    navLinkStatus: someVisible ? AppNavLinkStatus.visible : AppNavLinkStatus.hidden,
  }));
}
