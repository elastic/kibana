/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import type { CasePostRequest } from '../../../common';
import { GENERAL_CASES_OWNER } from '../../../common';
import type { ActionConnector } from '../../../common/types/domain';
import { CaseSeverity } from '../../../common/types/domain';
import type { CasesConfigurationUI } from '../../containers/types';
import type { CaseFormFieldsSchemaProps } from '../case_form_fields/schema';
import { normalizeActionConnector, getNoneConnector } from '../configure_cases/utils';
import {
  customFieldsFormDeserializer,
  customFieldsFormSerializer,
  getConnectorById,
  getConnectorsFormSerializer,
} from '../utils';

type GetInitialCaseValueArgs = Partial<Omit<CasePostRequest, 'owner'>> &
  Pick<CasePostRequest, 'owner'>;

export const getInitialCaseValue = ({
  owner,
  connector,
  ...restFields
}: GetInitialCaseValueArgs): CasePostRequest => ({
  title: '',
  assignees: [],
  tags: [],
  category: undefined,
  severity: CaseSeverity.LOW as const,
  description: '',
  settings: { syncAlerts: true },
  customFields: [],
  ...restFields,
  connector: connector ?? getNoneConnector(),
  owner,
});

export const trimUserFormData = (
  userFormData: Omit<
    CaseFormFieldsSchemaProps,
    'connectorId' | 'fields' | 'syncAlerts' | 'customFields'
  >
) => {
  let formData = {
    ...userFormData,
    title: userFormData.title.trim(),
    description: userFormData.description.trim(),
  };

  if (userFormData.category) {
    formData = { ...formData, category: userFormData.category.trim() };
  }

  if (userFormData.tags) {
    formData = { ...formData, tags: userFormData.tags.map((tag: string) => tag.trim()) };
  }

  return formData;
};

export const createFormDeserializer = (data: CasePostRequest): CaseFormFieldsSchemaProps => {
  const { connector, settings, customFields, ...restData } = data;

  return {
    ...restData,
    connectorId: connector.id,
    fields: connector.fields,
    syncAlerts: settings.syncAlerts,
    customFields: customFieldsFormDeserializer(customFields) ?? {},
  };
};

export const createFormSerializer = (
  connectors: ActionConnector[],
  currentConfiguration: CasesConfigurationUI,
  data: CaseFormFieldsSchemaProps
): CasePostRequest => {
  if (data == null || isEmpty(data)) {
    return getInitialCaseValue({
      owner: currentConfiguration.owner,
      connector: currentConfiguration.connector,
    });
  }

  const { connectorId: dataConnectorId, fields, syncAlerts, customFields, ...restData } = data;

  const serializedConnectorFields = getConnectorsFormSerializer({ fields });
  const caseConnector = getConnectorById(dataConnectorId, connectors);
  const connectorToUpdate = caseConnector
    ? normalizeActionConnector(caseConnector, serializedConnectorFields.fields)
    : getNoneConnector();

  const transformedCustomFields = customFieldsFormSerializer(
    customFields,
    currentConfiguration.customFields
  );

  const trimmedData = trimUserFormData(restData);

  return {
    ...trimmedData,
    connector: connectorToUpdate,
    settings: { syncAlerts: syncAlerts ?? false },
    owner: currentConfiguration.owner,
    customFields: transformedCustomFields,
  };
};

export const getOwnerDefaultValue = (availableOwners: string[]) =>
  availableOwners.includes(GENERAL_CASES_OWNER)
    ? GENERAL_CASES_OWNER
    : availableOwners[0] ?? GENERAL_CASES_OWNER;
