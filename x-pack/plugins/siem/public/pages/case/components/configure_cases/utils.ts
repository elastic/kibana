/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  CaseField,
  ActionType,
  CasesConfigurationMapping,
  ThirdPartyField,
} from '../../../../containers/case/configure/types';

import { ThirdPartyField as ConnectorConfigurationThirdPartyField } from '../../../../lib/connectors/types';

export const setActionTypeToMapping = (
  caseField: CaseField,
  newActionType: ActionType,
  mapping: CasesConfigurationMapping[]
): CasesConfigurationMapping[] => {
  const findItemIndex = mapping.findIndex(item => item.source === caseField);

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
  mapping.map(item => {
    if (item.source !== caseField && item.target === newThirdPartyField) {
      return { ...item, target: 'not_mapped' };
    } else if (item.source === caseField) {
      return { ...item, target: newThirdPartyField };
    }
    return item;
  });

export const createDefaultMapping = (
  fields: Record<string, ConnectorConfigurationThirdPartyField>
): CasesConfigurationMapping[] =>
  Object.keys(fields).map(
    key =>
      ({
        source: fields[key].defaultSourceField,
        target: key,
        actionType: fields[key].defaultActionType,
      } as CasesConfigurationMapping)
  );
