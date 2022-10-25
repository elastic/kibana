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
import { maybeAddCloudLinks } from './maybe_add_cloud_links';

interface CloudLinksDepsSetup {
  cloud?: CloudSetup;
  security?: SecurityPluginSetup;
}

interface CloudLinksDepsStart {
  cloud?: CloudStart;
  security?: SecurityPluginStart;
}

export class CloudLinksPlugin
  implements Plugin<void, void, CloudLinksDepsSetup, CloudLinksDepsStart>
{
  public setup() {}

  public start(core: CoreStart, { cloud, security }: CloudLinksDepsStart) {
    if (cloud?.isCloudEnabled && !core.http.anonymousPaths.isAnonymous(window.location.pathname)) {
      core.chrome.registerGlobalHelpExtensionMenuLink({
        linkType: 'custom',
        href: core.http.basePath.prepend('/app/home#/getting_started'),
        content: <FormattedMessage id="xpack.cloudLinks.setupGuide" defaultMessage="Setup guide" />,
        'data-test-subj': 'cloudOnboardingSetupGuideLink',
        priority: 1000, // We want this link to be at the very top.
      });

      if (security) {
        maybeAddCloudLinks({ security, chrome: core.chrome, cloud });
      }
    }
  }

  public stop() {}
}
