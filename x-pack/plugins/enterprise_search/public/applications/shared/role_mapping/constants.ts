/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ANY_AUTH_PROVIDER = '*';

export const ANY_AUTH_PROVIDER_OPTION_LABEL = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.anyDropDownOptionLabel',
  {
    defaultMessage: 'Any',
  }
);

export const ADD_ROLE_MAPPING_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.addRoleMappingButtonLabel',
  {
    defaultMessage: 'Add mapping',
  }
);

export const AUTH_ANY_PROVIDER_LABEL = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.anyAuthProviderLabel',
  {
    defaultMessage: 'Any current or future Auth Provider',
  }
);

export const AUTH_INDIVIDUAL_PROVIDER_LABEL = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.individualAuthProviderLabel',
  {
    defaultMessage: 'Select individual auth providers',
  }
);

export const ATTRIBUTE_SELECTOR_TITLE = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.attributeSelectorTitle',
  {
    defaultMessage: 'Attribute mapping',
  }
);

export const ROLE_LABEL = i18n.translate('xpack.enterpriseSearch.roleMapping.roleLabel', {
  defaultMessage: 'Role',
});

export const ALL_LABEL = i18n.translate('xpack.enterpriseSearch.roleMapping.allLabel', {
  defaultMessage: 'All',
});

export const AUTH_PROVIDER_LABEL = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.authProviderLabel',
  {
    defaultMessage: 'Auth provider',
  }
);

export const EXTERNAL_ATTRIBUTE_LABEL = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.externalAttributeLabel',
  {
    defaultMessage: 'External attribute',
  }
);

export const ATTRIBUTE_VALUE_LABEL = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.attributeValueLabel',
  {
    defaultMessage: 'Attribute value',
  }
);

export const DELETE_ROLE_MAPPING_TITLE = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.deleteRoleMappingTitle',
  {
    defaultMessage: 'Remove this role mapping',
  }
);

export const DELETE_ROLE_MAPPING_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.deleteRoleMappingDescription',
  {
    defaultMessage: 'Please note that deleting a mapping is permanent and cannot be undone',
  }
);

export const DELETE_ROLE_MAPPING_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.deleteRoleMappingButton',
  {
    defaultMessage: 'Delete mapping',
  }
);

export const FILTER_ROLE_MAPPINGS_PLACEHOLDER = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.filterRoleMappingsPlaceholder',
  {
    defaultMessage: 'Filter roles...',
  }
);

export const MANAGE_ROLE_MAPPING_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.manageRoleMappingButtonLabel',
  {
    defaultMessage: 'Manage',
  }
);

export const ROLE_MAPPINGS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.roleMappingsTitle',
  {
    defaultMessage: 'Users & roles',
  }
);

export const EMPTY_ROLE_MAPPINGS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.emptyRoleMappingsTitle',
  {
    defaultMessage: 'No role mappings yet',
  }
);

export const ROLE_MAPPINGS_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.roleMappingsDescription',
  {
    defaultMessage:
      'Define role mappings for elasticsearch-native and elasticsearch-saml authentication.',
  }
);
