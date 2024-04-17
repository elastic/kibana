/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ChromeHelpMenuLink } from '@kbn/core-chrome-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { CoreStart } from '@kbn/core/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';

import { openConnectionDetails } from '@kbn/cloud/connection_details';

export const createHelpMenuLinks = ({
  docLinks,
  helpSupportUrl,
  core,
  cloud,
  share,
}: {
  docLinks: DocLinksStart;
  core: CoreStart;
  cloud: CloudStart;
  share: SharePluginStart;
  helpSupportUrl: string;
}) => {
  const helpMenuLinks: ChromeHelpMenuLink[] = [
    {
      title: i18n.translate('xpack.cloudLinks.helpMenuLinks.documentation', {
        defaultMessage: 'Documentation',
      }),
      href: docLinks.links.elasticStackGetStarted,
    },
    {
      title: i18n.translate('xpack.cloudLinks.helpMenuLinks.support', {
        defaultMessage: 'Support',
      }),
      href: helpSupportUrl,
    },
    {
      title: i18n.translate('xpack.cloudLinks.helpMenuLinks.giveFeedback', {
        defaultMessage: 'Give feedback',
      }),
      href: docLinks.links.kibana.feedback,
    },
    {
      title: i18n.translate('xpack.cloudLinks.helpMenuLinks.connectionDetails', {
        defaultMessage: 'Connection details',
      }),
      dataTestSubj: 'connectionDetailsHelpLink',
      onClick: () => {
        openConnectionDetails({
          props: {
            start: {
              core,
              plugins: {
                share,
                cloud,
              },
            },
          },
          start: {
            core,
          },
        });
      },
    },
  ];

  return helpMenuLinks;
};
