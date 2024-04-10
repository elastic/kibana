/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import documentation from '../images/documentation.png';
import forum from '../images/forum.png';
import demo from '../images/demo.png';
import labs from '../images/labs.png';
import * as i18n from './translations';

const footer = [
  {
    icon: documentation,
    key: 'documentation',
    title: i18n.FOOTER_DOCUMENTATION_TITLE,
    description: i18n.FOOTER_DOCUMENTATION_DESCRIPTION,
    link: {
      title: i18n.FOOTER_DOCUMENTATION_LINK_TITLE,
      href: 'https://docs.elastic.co/integrations/elastic-security-intro',
    },
  },
  {
    icon: forum,
    key: 'forum',
    title: i18n.FOOTER_FORUM_TITLE,
    description: i18n.FOOTER_FORUM_DESCRIPTION,
    link: {
      title: i18n.FOOTER_FORUM_LINK_TITLE,
      href: 'https://discuss.elastic.co/c/security/83',
    },
  },
  {
    icon: demo,
    key: 'demo',
    title: i18n.FOOTER_DEMO_TITLE,
    description: i18n.FOOTER_DEMO_DESCRIPTION,
    link: {
      title: i18n.FOOTER_DEMO_LINK_TITLE,
      href: 'https://www.elastic.co/demo-gallery?solutions=security&features=null',
    },
  },
  {
    icon: labs,
    key: 'labs',
    title: i18n.FOOTER_LABS_TITLE,
    description: i18n.FOOTER_LABS_DESCRIPTION,
    link: {
      title: i18n.FOOTER_LABS_LINK_TITLE,
      href: 'https://www.elastic.co/security-labs',
    },
  },
];

export const getFooter = () => footer;
