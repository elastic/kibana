/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorTypeFields, ConnectorTypes } from '../../../common/api';
import {
  CaseField,
  ActionType,
  ThirdPartyField,
  CaseConnector,
  CaseConnectorMapping,
} from '../../containers/configure/types';
import { CaseActionConnector } from '../types';

export const setActionTypeToMapping = (
  caseField: CaseField,
  newActionType: ActionType,
  mapping: CaseConnectorMapping[]
): CaseConnectorMapping[] => {
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
  mapping: CaseConnectorMapping[]
): CaseConnectorMapping[] =>
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

export const normalizeActionConnector = (
  actionConnector: CaseActionConnector,
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
  connectors: CaseActionConnector[],
  caseConnector: CaseConnector
): CaseActionConnector | null => connectors.find((c) => c.id === caseConnector.id) ?? null;
