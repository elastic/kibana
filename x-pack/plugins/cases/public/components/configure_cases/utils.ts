/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorTypeFields } from '../../../common/types/domain';
import { ConnectorTypes } from '../../../common/types/domain';
import type {
  ConnectorMappingSource,
  ConnectorMappingActionType,
  ConnectorMappingTarget,
  CaseConnector,
  CaseConnectorMapping,
} from '../../containers/configure/types';
import type { CaseActionConnector } from '../types';

export const setActionTypeToMapping = (
  caseField: ConnectorMappingSource,
  newActionType: ConnectorMappingActionType,
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
  caseField: ConnectorMappingSource,
  newThirdPartyField: ConnectorMappingTarget,
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
