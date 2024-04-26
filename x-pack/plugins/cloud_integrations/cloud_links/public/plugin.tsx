/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CoreStart, Plugin } from '@kbn/core/public';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/public';
import type { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import * as connectionDetails from '@kbn/cloud/connection_details';
import { maybeAddCloudLinks } from './maybe_add_cloud_links';

interface CloudLinksDepsSetup {
  cloud?: CloudSetup;
  security?: SecurityPluginSetup;
}

interface CloudLinksDepsStart {
  cloud?: CloudStart;
  security?: SecurityPluginStart;
  share: SharePluginStart;
  guidedOnboarding?: GuidedOnboardingPluginStart;
}

export class CloudLinksPlugin
  implements Plugin<void, void, CloudLinksDepsSetup, CloudLinksDepsStart>
{
  public setup() {}

  public start(core: CoreStart, plugins: CloudLinksDepsStart) {
    const { cloud, security, guidedOnboarding, share } = plugins;

    if (cloud?.isCloudEnabled && !core.http.anonymousPaths.isAnonymous(window.location.pathname)) {
      if (guidedOnboarding?.guidedOnboardingApi?.isEnabled) {
        core.chrome.registerGlobalHelpExtensionMenuLink({
          linkType: 'custom',
          href: core.http.basePath.prepend('/app/home#/getting_started'),
          content: (
            <FormattedMessage id="xpack.cloudLinks.setupGuide" defaultMessage="Setup guides" />
          ),
          'data-test-subj': 'cloudOnboardingSetupGuideLink',
          priority: 1000, // We want this link to be at the very top.
        });
      }

      if (security) {
        maybeAddCloudLinks({
          core,
          security,
          cloud,
          share,
        });
      }
    }

    connectionDetails.setGlobalDependencies({
      start: {
        core,
        plugins,
      },
    });
  }

  public stop() {}
}
