/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ConnectorTypeFields, ConnectorTypes } from '../../../../../case/common/api';
import {
  CaseField,
  ActionType,
  ThirdPartyField,
  ActionConnector,
  CaseConnector,
  CasesConfigurationMapping,
} from '../../containers/configure/types';

export const setActionTypeToMapping = (
  caseField: CaseField,
  newActionType: ActionType,
  mapping: CasesConfigurationMapping[]
): CasesConfigurationMapping[] => {
  const findItemIndex = mapping.findIndex((item) => item.source === caseField);

  if (findItemIndex >= 0) {
    return [
      ...mapping.slice(0, findItemIndex),
      { ...mapping[findItemIndex], actionType: newActionType },
      ...mapping.slice(findItemIndex + 1),
    ];
  }

  return [...mapping];
};

export const setThirdPartyToMapping = (
  caseField: CaseField,
  newThirdPartyField: ThirdPartyField,
  mapping: CasesConfigurationMapping[]
): CasesConfigurationMapping[] =>
  mapping.map((item) => {
    if (item.source !== caseField && item.target === newThirdPartyField) {
      return { ...item, target: 'not_mapped' };
    } else if (item.source === caseField) {
      return { ...item, target: newThirdPartyField };
    }
    return item;
  });

export const getNoneConnector = (): CaseConnector => ({
  id: 'none',
  name: 'none',
  type: ConnectorTypes.none,
  fields: null,
});

export const getConnectorById = (
  id: string,
  connectors: ActionConnector[]
): ActionConnector | null => connectors.find((c) => c.id === id) ?? null;

export const normalizeActionConnector = (
  actionConnector: ActionConnector,
  fields: CaseConnector['fields'] = null
): CaseConnector => {
  const caseConnectorFieldsType = {
    type: actionConnector.actionTypeId,
    fields,
  } as ConnectorTypeFields;
  return {
    id: actionConnector.id,
    name: actionConnector.name,
    ...caseConnectorFieldsType,
  };
};

export const normalizeCaseConnector = (
  connectors: ActionConnector[],
  caseConnector: CaseConnector
): ActionConnector | null => connectors.find((c) => c.id === caseConnector.id) ?? null;
