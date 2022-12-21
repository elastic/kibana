/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBoxOptionOption } from '@elastic/eui';

import { AttributeName, ElasticsearchUser } from '../types';

export interface RoleMappingsBaseServerDetails {
  attributes: string[];
  elasticsearchRoles: string[];
  elasticsearchUsers: ElasticsearchUser[];
  smtpSettingsPresent: boolean;
}

export interface RoleMappingsBaseActions {
  handleAttributeSelectorChange(
    value: AttributeName,
    firstElasticsearchRole: string
  ): { value: AttributeName; firstElasticsearchRole: string };
  handleAttributeValueChange(value: string): { value: string };
  handleDeleteMapping(roleMappingId: string): { roleMappingId: string };
  handleUsernameSelectChange(username: string): { username: string };
  handleSaveMapping(): void;
  handleSaveUser(): void;
  initializeRoleMapping(roleMappingId?: string): { roleMappingId?: string };
  initializeSingleUserRoleMapping(roleMappingId?: string): { roleMappingId?: string };
  initializeRoleMappings(): void;
  resetState(): void;
  setElasticsearchUser(elasticsearchUser?: ElasticsearchUser): {
    elasticsearchUser: ElasticsearchUser;
  };
  openRoleMappingFlyout(): void;
  openSingleUserRoleMappingFlyout(): void;
  closeUsersAndRolesFlyout(): void;
  setRoleMappingErrors(errors: string[]): { errors: string[] };
  enableRoleBasedAccess(): void;
  setUserExistingRadioValue(userFormUserIsExisting: boolean): { userFormUserIsExisting: boolean };
  setElasticsearchUsernameValue(username: string): { username: string };
  setElasticsearchEmailValue(email: string): { email: string };
  setUserCreated(): void;
  setUserFormIsNewUser(userFormIsNewUser: boolean): { userFormIsNewUser: boolean };
}

export interface RoleMappingsBaseValues extends RoleMappingsBaseServerDetails {
  attributeName: AttributeName;
  attributeValue: string;
  dataLoading: boolean;
  elasticsearchUser: ElasticsearchUser;
  roleMappingFlyoutOpen: boolean;
  singleUserRoleMappingFlyoutOpen: boolean;
  selectedOptions: EuiComboBoxOptionOption[];
  roleMappingErrors: string[];
  userFormUserIsExisting: boolean;
  userCreated: boolean;
  userFormIsNewUser: boolean;
  accessAllEngines: boolean;
  formLoading: boolean;
}
