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

export const CONFIG_CUSTOM_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.configCustom.button',
  {
    defaultMessage: 'Create Custom API Source',
  }
);

export const CONFIG_OAUTH_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.configOauth.label',
  {
    defaultMessage: 'Complete connection',
  }
);

export const CONFIG_OAUTH_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.configOauth.button',
  {
    defaultMessage: 'Complete connection',
  }
);

export const CONFIGURED_SOURCES_LIST_UNCONNECTED_TOOLTIP = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.configuredSources.unConnectedTooltip',
  {
    defaultMessage: 'No connected sources',
  }
);

export const CONFIGURED_SOURCES_LIST_ACCOUNT_ONLY_TOOLTIP = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.configuredSources.accountOnlyTooltip',
  {
    defaultMessage:
      'Private content source. Each user must add the content source from their own personal dashboard.',
  }
);

export const CONFIGURED_SOURCES_CONNECT_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.configuredSources.connectButton',
  {
    defaultMessage: 'Connect',
  }
);

export const CONFIGURED_SOURCES_EMPTY_STATE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.configuredSources.emptyState',
  {
    defaultMessage: 'There are no configured sources matching your query.',
  }
);

export const CONFIGURED_SOURCES_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.configuredSources.title',
  {
    defaultMessage: 'Configured content sources',
  }
);

export const CONFIGURED_SOURCES_EMPTY_BODY = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.configuredSources.body',
  {
    defaultMessage: 'Configured and ready for connection.',
  }
);

export const OAUTH_SAVE_CONFIG_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.saveConfig.button',
  {
    defaultMessage: 'Save configuration',
  }
);

export const OAUTH_REMOVE_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.remove.button',
  {
    defaultMessage: 'Remove',
  }
);

export const OAUTH_BACK_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.back.button',
  {
    defaultMessage: ' Go back',
  }
);

export const OAUTH_STEP_2 = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.saveConfig.oauthStep2',
  {
    defaultMessage: 'Provide the appropriate configuration information',
  }
);

export const SAVE_CUSTOM_BODY1 = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.saveCustom.body1',
  {
    defaultMessage: 'Your endpoints are ready to accept requests.',
  }
);

export const SAVE_CUSTOM_BODY2 = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.saveCustom.body2',
  {
    defaultMessage: 'Be sure to copy your API keys below.',
  }
);

export const SAVE_CUSTOM_RETURN_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.saveCustom.return.button',
  {
    defaultMessage: 'Return to Sources',
  }
);

export const SAVE_CUSTOM_API_KEYS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.saveCustom.apiKeys.title',
  {
    defaultMessage: 'API Keys',
  }
);

export const SAVE_CUSTOM_API_KEYS_BODY = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.saveCustom.apiKeys.body',
  {
    defaultMessage: "You'll need these keys to sync documents for this custom source.",
  }
);

export const SAVE_CUSTOM_ACCESS_TOKEN_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.saveCustom.accessToken.label',
  {
    defaultMessage: 'Access Token',
  }
);

export const SAVE_CUSTOM_ID_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.saveCustom.id.label',
  {
    defaultMessage: 'ID',
  }
);

export const SAVE_CUSTOM_VISUAL_WALKTHROUGH_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.saveCustom.visualWalkthrough.title',
  {
    defaultMessage: 'Visual Walkthrough',
  }
);

export const SAVE_CUSTOM_STYLING_RESULTS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.saveCustom.stylingResults.title',
  {
    defaultMessage: 'Styling Results',
  }
);

export const SAVE_CUSTOM_DOC_PERMISSIONS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.saveCustom.docPermissions.title',
  {
    defaultMessage: 'Set document-level permissions',
  }
);

export const SAVE_CUSTOM_FEATURES_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.saveCustom.features.button',
  {
    defaultMessage: 'Learn about Platinum features',
  }
);

export const SOURCE_FEATURES_SEARCHABLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.sourceFeatures.searchable.text',
  {
    defaultMessage: 'The following items are searchable:',
  }
);

export const SOURCE_FEATURES_REMOTE_FEATURE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.sourceFeatures.remote.text',
  {
    defaultMessage:
      'Message data and other information is searchable in real-time from the Workplace Search experience.',
  }
);

export const SOURCE_FEATURES_PRIVATE_FEATURE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.sourceFeatures.private.text',
  {
    defaultMessage:
      'Results returned are specific and relevant to you. Connecting this source does not expose your personal data to other search users - only you.',
  }
);

export const SOURCE_FEATURES_GLOBAL_ACCESS_PERMISSIONS_FEATURE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.sourceFeatures.globalAccessPermissions.text',
  {
    defaultMessage:
      'All documents accessible to the connecting service user will be synchronized and made available to the organization’s users, or group’s users. Documents are immediately available for search',
  }
);

export const SOURCE_FEATURES_DOCUMENT_LEVEL_PERMISSIONS_FEATURE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.sourceFeatures.documentLevelPermissions.text',
  {
    defaultMessage:
      'Document-level permissions manage user content access based on defined rules. Allow or deny access to certain documents for individuals and groups.',
  }
);

export const SOURCE_FEATURES_EXPLORE_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.sourceFeatures.explore.button',
  {
    defaultMessage: 'Explore Platinum features',
  }
);

export const SOURCE_FEATURES_INCLUDED_FEATURES_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.sourceFeatures.included.title',
  {
    defaultMessage: 'Included features',
  }
);

export const CONNECT_REMOTE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.connect.remote.text',
  {
    defaultMessage: 'Remote',
  }
);

export const CONNECT_PRIVATE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.connect.private.text',
  {
    defaultMessage: 'Private',
  }
);

export const CONNECT_WHICH_OPTION_LINK = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.connect.whichOption.link',
  {
    defaultMessage: 'Which option should I choose?',
  }
);

export const CONNECT_DOC_PERMISSIONS_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.connect.permissions.label',
  {
    defaultMessage: 'Enable document-level permission synchronization',
  }
);

export const CONNECT_DOC_PERMISSIONS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.connect.permissions.title',
  {
    defaultMessage: 'Document-level permissions',
  }
);

export const CONNECT_NEEDS_PERMISSIONS = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.connect.needsPermissions.text',
  {
    defaultMessage:
      'Document-level permission information will be synchronized. Additional configuration is required following the initial connection before documents are available for search.',
  }
);

export const CONNECT_NOT_SYNCED_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.connect.notSynced.title',
  {
    defaultMessage: 'Document-level permissions will not be synchronized',
  }
);

export const CONNECT_NOT_SYNCED_TEXT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.contentSource.connect.notSynced.text',
  {
    defaultMessage:
      'All documents accessible to the connecting service user will be synchronized and made available to the organization’s users, or group’s users. Documents are immediately available for search. ',
  }
);
