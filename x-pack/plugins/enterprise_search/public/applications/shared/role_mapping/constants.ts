/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { ProductName } from '../types';

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

export const ATTRIBUTE_VALUE_ERROR = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.attributeValueError',
  {
    defaultMessage: 'Attribute value is required',
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
    defaultMessage: 'Filter role mappings',
  }
);

export const ROLE_MAPPINGS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.roleMappingsTitle',
  {
    defaultMessage: 'Users & roles',
  }
);

export const ADD_ROLE_MAPPING_TITLE = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.newRoleMappingTitle',
  { defaultMessage: 'Add role mapping' }
);

export const MANAGE_ROLE_MAPPING_TITLE = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.manageRoleMappingTitle',
  { defaultMessage: 'Manage role mapping' }
);

export const ROLE_MAPPING_NOT_FOUND = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.notFoundMessage',
  {
    defaultMessage: 'No matching Role mapping found.',
  }
);

export const ROLE_MAPPING_FLYOUT_CREATE_TITLE = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.flyoutCreateTitle',
  {
    defaultMessage: 'Create a role mapping',
  }
);

export const ROLE_MAPPING_FLYOUT_UPDATE_TITLE = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.flyoutUpdateTitle',
  {
    defaultMessage: 'Update role mapping',
  }
);

export const ROLE_MAPPING_FLYOUT_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.flyoutDescription',
  {
    defaultMessage: 'Assign roles and permissions based on user attributes',
  }
);

export const ROLE_MAPPING_FLYOUT_CREATE_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.roleMappingFlyoutCreateButton',
  {
    defaultMessage: 'Create mapping',
  }
);

export const ROLE_MAPPING_FLYOUT_UPDATE_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.roleMappingFlyoutUpdateButton',
  {
    defaultMessage: 'Update mapping',
  }
);

export const SAVE_ROLE_MAPPING = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.saveRoleMappingButtonLabel',
  { defaultMessage: 'Save role mapping' }
);

export const UPDATE_ROLE_MAPPING = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.updateRoleMappingButtonLabel',
  { defaultMessage: 'Update role mapping' }
);

export const ROLE_MAPPINGS_HEADING_TITLE = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.roleMappingsHeadingTitle',
  { defaultMessage: 'Role mappings' }
);

export const ROLE_MAPPINGS_HEADING_DESCRIPTION = (productName: ProductName) =>
  i18n.translate('xpack.enterpriseSearch.roleMapping.roleMappingsHeadingDescription', {
    defaultMessage:
      'Role mappings provide an interface to associate native or SAML-governed role attributes with {productName} permissions.',
    values: { productName },
  });

export const ROLE_MAPPINGS_HEADING_DOCS_LINK = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.roleMappingsHeadingDocsLink',
  { defaultMessage: 'Learn more about role mappings.' }
);

export const ROLE_MAPPINGS_HEADING_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.roleMappingsHeadingButton',
  { defaultMessage: 'Create a new role mapping' }
);

export const ROLE_MAPPINGS_NO_RESULTS_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.noResults.message',
  { defaultMessage: 'Create a new role mapping' }
);

export const ROLES_DISABLED_TITLE = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.rolesDisabledTitle',
  { defaultMessage: 'Role-based access is disabled' }
);

export const ROLES_DISABLED_DESCRIPTION = (productName: ProductName) =>
  i18n.translate('xpack.enterpriseSearch.roleMapping.rolesDisabledDescription', {
    defaultMessage:
      'All users set for this deployment currently have full access to {productName}. To restrict access and manage permissions, you must enable role-based access for Enterprise Search.',
    values: { productName },
  });

export const ROLES_DISABLED_NOTE = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.rolesDisabledNote',
  {
    defaultMessage:
      'Note: enabling role-based access restricts access for both App Search and Workplace Search. Once enabled, review access management for both products, if applicable.',
  }
);

export const ENABLE_ROLES_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.enableRolesButton',
  { defaultMessage: 'Enable role-based access' }
);

export const ENABLE_ROLES_LINK = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.enableRolesLink',
  { defaultMessage: 'Learn more about role-based access' }
);

export const INVITATION_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.invitationDescription',
  {
    defaultMessage:
      'This URL can be shared with the user, allowing them to accept the Enterprise Search invitation and set a new password',
  }
);

export const NEW_INVITATION_LABEL = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.newInvitationLabel',
  { defaultMessage: 'Invitation URL' }
);

export const EXISTING_INVITATION_LABEL = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.existingInvitationLabel',
  { defaultMessage: 'The user has not yet accepted the invitation.' }
);

export const INVITATION_LINK = i18n.translate('xpack.enterpriseSearch.roleMapping.invitationLink', {
  defaultMessage: 'Enterprise Search Invitation Link',
});

export const NO_USERS_TITLE = i18n.translate('xpack.enterpriseSearch.roleMapping.noUsersTitle', {
  defaultMessage: 'No user added',
});

export const NO_USERS_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.noUsersDescription',
  {
    defaultMessage:
      'Users can be added individually, for flexibility. Role mappings provide a broader interface for adding large number of users using user attributes.',
  }
);

export const ENABLE_USERS_LINK = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.enableUsersLink',
  { defaultMessage: 'Learn more about user management' }
);
