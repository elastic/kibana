/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ADD_SOURCE_NEW_SOURCE_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.addSourceList.newSourceDescription',
  {
    defaultMessage:
      'When configuring and connecting a source, you are creating distinct entities with searchable content synchronized from the content platform itself. A source can be added using one of the available source connectors or via Custom API Sources, for additional flexibility. ',
  }
);

export const ADD_SOURCE_ORG_SOURCE_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.addSourceList.orgSourceDescription',
  {
    defaultMessage:
      'Shared content sources are available to your entire organization or can be assigned to specific user groups.',
  }
);

export const ADD_SOURCE_PRIVATE_SOURCE_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.addSourceList.privateSourceDescription',
  {
    defaultMessage:
      'Connect a new source to add its content and documents to your search experience.',
  }
);

export const ADD_SOURCE_NO_SOURCES_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.addSourceList.noSourcesTitle',
  {
    defaultMessage: 'Configure and connect your first content source',
  }
);

export const ADD_SOURCE_ORG_SOURCES_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.addSourceList.orgSourcesTitle',
  {
    defaultMessage: 'Add a shared content source',
  }
);

export const ADD_SOURCE_PRIVATE_SOURCES_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.addSourceList.privateSourcesTitle',
  {
    defaultMessage: 'Add a new content source',
  }
);

export const ADD_SOURCE_PLACEHOLDER = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.addSourceList.placeholder',
  {
    defaultMessage: 'Filter sources...',
  }
);

export const ADD_SOURCE_EMPTY_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.addSourceList.emptyTitle',
  {
    defaultMessage: 'No available sources',
  }
);
export const ADD_SOURCE_EMPTY_BODY = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.addSourceList.emptyBody',
  {
    defaultMessage:
      'Sources will be available for search when an administrator adds them to this organization.',
  }
);

export const AVAILABLE_SOURCE_EMPTY_STATE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.availableSourceList.emptyState',
  {
    defaultMessage: 'No available sources matching your query.',
  }
);

export const AVAILABLE_SOURCE_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.availableSourceList.title',
  {
    defaultMessage: 'Available for configuration',
  }
);

export const AVAILABLE_SOURCE_BODY = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.availableSourceList.body',
  {
    defaultMessage: 'Configure an available source or build your own with the ',
  }
);

export const AVAILABLE_SOURCE_CUSTOM_SOURCE_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.availableSourceList.customSource.button',
  {
    defaultMessage: 'Custom API Source',
  }
);

export const CONFIG_COMPLETED_PRIVATE_SOURCES_DOCS_LINK = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.configCompleted.privateDisabled.button',
  {
    defaultMessage: 'Learn more about private content sources.',
  }
);

export const CONFIG_COMPLETED_CONFIGURE_NEW_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.configCompleted.configureNew.button',
  {
    defaultMessage: 'Configure a new content source',
  }
);

export const CONFIG_INTRO_ALT_TEXT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.configIntro.alt.text',
  {
    defaultMessage: 'Connection illustration',
  }
);

export const CONFIG_INTRO_STEPS_TEXT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.configIntro.steps.text',
  {
    defaultMessage: 'Quick setup, then all of your documents will be searchable.',
  }
);

export const CONFIG_INTRO_STEP1_HEADING = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.configIntro.step1.heading',
  {
    defaultMessage: 'Step 1',
  }
);

export const CONFIG_INTRO_STEP1_TEXT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.configIntro.step1.text',
  {
    defaultMessage:
      'Setup a secure OAuth application through the content source that you or your team will use to connect and synchronize content. You only have to do this once per content source.',
  }
);

export const CONFIG_INTRO_STEP2_HEADING = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.configIntro.step2.heading',
  {
    defaultMessage: 'Step 2',
  }
);

export const CONFIG_INTRO_STEP2_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.configIntro.step2.title',
  {
    defaultMessage: 'Connect the content source',
  }
);

export const CONFIG_INTRO_STEP2_TEXT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.configIntro.step2.text',
  {
    defaultMessage:
      'Use the new OAuth application to connect any number of instances of the content source to Workplace Search.',
  }
);
