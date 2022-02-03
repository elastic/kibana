/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { ProductName } from '../types';

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

export const USERNAME_LABEL = i18n.translate('xpack.enterpriseSearch.roleMapping.usernameLabel', {
  defaultMessage: 'Username',
});

export const EMAIL_LABEL = i18n.translate('xpack.enterpriseSearch.roleMapping.emailLabel', {
  defaultMessage: 'Email',
});

export const ALL_LABEL = i18n.translate('xpack.enterpriseSearch.roleMapping.allLabel', {
  defaultMessage: 'All',
});

export const GROUPS_LABEL = i18n.translate('xpack.enterpriseSearch.roleMapping.groupsLabel', {
  defaultMessage: 'Groups',
});

export const ENGINES_LABEL = i18n.translate('xpack.enterpriseSearch.roleMapping.enginesLabel', {
  defaultMessage: 'Engines',
});

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

export const REMOVE_ROLE_MAPPING_TITLE = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.removeRoleMappingTitle',
  {
    defaultMessage: 'Remove role mapping',
  }
);

export const DELETE_ROLE_MAPPING_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.deleteRoleMappingDescription',
  {
    defaultMessage: 'Please note that deleting a mapping is permanent and cannot be undone',
  }
);

export const REMOVE_ROLE_MAPPING_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.removeRoleMappingButton',
  {
    defaultMessage: 'Remove mapping',
  }
);

export const REMOVE_USER_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.removeUserButton',
  {
    defaultMessage: 'Remove user',
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
    defaultMessage: 'Users and roles',
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
  { defaultMessage: 'No matching role mappings found' }
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

export const RBAC_BUTTON_DISABLED_LABEL = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.rbacButtonDisabledLabel',
  {
    defaultMessage: 'Enabling RBAC can be performed by a superuser.',
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

export const NEW_USER_LABEL = i18n.translate('xpack.enterpriseSearch.roleMapping.newUserLabel', {
  defaultMessage: 'Create new user',
});

export const EXISTING_USER_LABEL = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.existingUserLabel',
  { defaultMessage: 'Add existing user' }
);

export const USERNAME_NO_USERS_TEXT = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.usernameNoUsersText',
  { defaultMessage: 'No existing user eligible for addition.' }
);

export const REQUIRED_LABEL = i18n.translate('xpack.enterpriseSearch.roleMapping.requiredLabel', {
  defaultMessage: 'Required',
});

export const USERS_HEADING_TITLE = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.usersHeadingTitle',
  { defaultMessage: 'Users' }
);

export const USERS_HEADING_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.usersHeadingDescription',
  {
    defaultMessage:
      'User management provides granular access for individual or special permission needs. Some users may be excluded from this list. These include users from federated sources such as SAML, which are managed by role mappings, and built-in user accounts such as the “elastic” or “enterprise_search” users.',
  }
);

export const USERS_HEADING_LABEL = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.usersHeadingLabel',
  { defaultMessage: 'Add a new user' }
);

export const UPDATE_USER_LABEL = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.updateUserLabel',
  {
    defaultMessage: 'Update user',
  }
);

export const ADD_USER_LABEL = i18n.translate('xpack.enterpriseSearch.roleMapping.addUserLabel', {
  defaultMessage: 'Add user',
});

export const USER_ADDED_LABEL = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.userAddedLabel',
  {
    defaultMessage: 'User added',
  }
);

export const USER_UPDATED_LABEL = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.userUpdatedLabel',
  {
    defaultMessage: 'User updated',
  }
);

export const NEW_USER_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.newUserDescription',
  {
    defaultMessage: 'Provide granular access and permissions',
  }
);

export const UPDATE_USER_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.updateUserDescription',
  {
    defaultMessage: 'Manage granular access and permissions',
  }
);

export const DEACTIVATED_LABEL = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.deactivatedLabel',
  {
    defaultMessage: 'Deactivated',
  }
);

export const INVITATION_PENDING_LABEL = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.invitationPendingLabel',
  {
    defaultMessage: 'Invitation pending',
  }
);

export const ROLE_MODAL_TEXT = i18n.translate('xpack.enterpriseSearch.roleMapping.roleModalText', {
  defaultMessage:
    'Removing a role mapping could revoke access to the currently logged-in user. Before proceeding, verify that the currently logged-in user has the appropriate access level via a different role mapping to avoid undesired behavior. This action may not take effect immediately for SAML-governed roles. Users with an active SAML session will retain access until it expires.',
});

export const USER_MODAL_TITLE = (username: string) =>
  i18n.translate('xpack.enterpriseSearch.roleMapping.userModalTitle', {
    defaultMessage: 'Remove {username}',
    values: { username },
  });

export const USER_MODAL_TEXT = i18n.translate('xpack.enterpriseSearch.roleMapping.userModalText', {
  defaultMessage:
    'Removing a user immediately revokes access to the experience, unless this user’s attributes also corresponds to a role mapping for native and SAML-governed authentication, in which case associated role mappings should also be reviewed and adjusted, as needed.',
});

export const FILTER_USERS_LABEL = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.filterUsersLabel',
  {
    defaultMessage: 'Filter users',
  }
);

export const NO_USERS_LABEL = i18n.translate('xpack.enterpriseSearch.roleMapping.noUsersLabel', {
  defaultMessage: 'No matching users found',
});

export const EXTERNAL_ATTRIBUTE_TOOLTIP = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.externalAttributeTooltip',
  {
    defaultMessage:
      'External attributes are defined by the identity provider, and varies from service to service.',
  }
);
export const DEACTIVATED_USER_CALLOUT_LABEL = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.deactivatedUserCalloutLabel',
  {
    defaultMessage: 'User deactivated',
  }
);

export const DEACTIVATED_USER_CALLOUT_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.deactivatedUserCalloutDescription',
  {
    defaultMessage:
      'This user is not currently active, and access has been temporarily revoked. Users can be re-activated via the User Management area of the Kibana console.',
  }
);

export const SMTP_CALLOUT_LABEL = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.smtpCalloutLabel',
  {
    defaultMessage: 'Personalized invitations will be automatically sent when an Enterprise Search',
  }
);

export const SMTP_LINK_LABEL = i18n.translate('xpack.enterpriseSearch.roleMapping.smtpLinkLabel', {
  defaultMessage: 'SMTP configuration is provided',
});

export const KIBANA_ACCESS_WARNING_TITLE = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.kibanaAccessWarningTitle',
  {
    defaultMessage: 'Kibana access warning',
  }
);

export const KIBANA_ACCESS_WARNING_ERROR_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.kibanaAccessWarningErrorMessage',
  {
    defaultMessage:
      'This Elasticsearch user does not have an Enterprise Search role in Elasticsearch. They may not have access to Kibana.',
  }
);

export const KIBANA_ACCESS_WARNING_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.roleMapping.kibanaAccessWarningDescription',
  {
    defaultMessage: 'Consider giving them the "enterprise-search-user" role.',
  }
);
