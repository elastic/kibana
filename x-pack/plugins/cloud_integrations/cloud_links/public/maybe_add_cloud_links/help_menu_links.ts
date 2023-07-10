/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { ChromeHelpMenuLink } from '@kbn/core-chrome-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';

export const createHelpMenuLinks = ({
  docLinks,
  helpSupportUrl,
}: {
  docLinks: DocLinksStart;
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
  ];

  return helpMenuLinks;
};
