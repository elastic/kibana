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
