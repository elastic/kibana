/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFormRow, EuiFlexItem, EuiFlexGroup, EuiSuperSelectOption } from '@elastic/eui';
import styled from 'styled-components';

import {
  CasesConfigurationMapping,
  CaseField,
  ActionType,
  ThirdPartyField,
} from '../../../../containers/case/configure/types';
import { FieldMappingRow } from './field_mapping_row';
import * as i18n from './translations';

import { connectorsConfiguration } from '../../../../lib/connectors/config';
import { setActionTypeToMapping, setThirdPartyToMapping } from './utils';
import {
  ThirdPartyField as ConnectorConfigurationThirdPartyField,
  AllThirdPartyFields,
} from '../../../../lib/connectors/types';
import { createDefaultMapping } from '../../../../lib/connectors/utils';

const FieldRowWrapper = styled.div`
  margin-top: 8px;
  font-size: 14px;
`;

const actionTypeOptions: Array<EuiSuperSelectOption<ActionType>> = [
  {
    value: 'nothing',
    inputDisplay: <>{i18n.FIELD_MAPPING_EDIT_NOTHING}</>,
    'data-test-subj': 'edit-update-option-nothing',
  },
  {
    value: 'overwrite',
    inputDisplay: <>{i18n.FIELD_MAPPING_EDIT_OVERWRITE}</>,
    'data-test-subj': 'edit-update-option-overwrite',
  },
  {
    value: 'append',
    inputDisplay: <>{i18n.FIELD_MAPPING_EDIT_APPEND}</>,
    'data-test-subj': 'edit-update-option-append',
  },
];

const createSuperSelectOptions = <T extends {}>(
  options: Array<{ key: T; label: string }>
): Array<EuiSuperSelectOption<T>> => {
  return options.map(option => ({
    value: option.key,
    inputDisplay: <span>{option.label}</span>,
  }));
};

const getThirdPartyOptions = (
  caseField: CaseField,
  thirdPartyFields: Record<string, ConnectorConfigurationThirdPartyField>
) =>
  createSuperSelectOptions<AllThirdPartyFields>(
    Object.keys(thirdPartyFields)
      .filter(key => thirdPartyFields[key].validSourceFields.includes(caseField))
      .map(key => ({ key: key as AllThirdPartyFields, label: thirdPartyFields[key].label }))
      .concat([{ key: 'not_mapped', label: i18n.MAPPING_FIELD_NOT_MAPPED }])
  );

export interface FieldMappingProps {
  disabled: boolean;
  mapping: CasesConfigurationMapping[] | null;
  connectorActionTypeId: string;
  onChangeMapping: (newMapping: CasesConfigurationMapping[]) => void;
}

const FieldMappingComponent: React.FC<FieldMappingProps> = ({
  disabled,
  mapping,
  onChangeMapping,
  connectorActionTypeId,
}) => {
  const onChangeActionType = useCallback(
    (caseField: CaseField, newActionType: ActionType) => {
      const myMapping = mapping ?? defaultMapping;
      onChangeMapping(setActionTypeToMapping(caseField, newActionType, myMapping));
    },
    [mapping]
  );

  const onChangeThirdParty = useCallback(
    (caseField: CaseField, newThirdPartyField: ThirdPartyField) => {
      const myMapping = mapping ?? defaultMapping;
      onChangeMapping(setThirdPartyToMapping(caseField, newThirdPartyField, myMapping));
    },
    [mapping]
  );

  const selectedConnector = connectorsConfiguration[connectorActionTypeId] ?? { fields: {} };
  const defaultMapping = useMemo(() => createDefaultMapping(selectedConnector.fields), [
    selectedConnector.fields,
  ]);

  return (
    <>
      <EuiFormRow fullWidth data-test-subj="case-configure-field-mapping-cols">
        <EuiFlexGroup>
          <EuiFlexItem>
            <span className="euiFormLabel">{i18n.FIELD_MAPPING_FIRST_COL}</span>
          </EuiFlexItem>
          <EuiFlexItem>
            <span className="euiFormLabel">{i18n.FIELD_MAPPING_SECOND_COL}</span>
          </EuiFlexItem>
          <EuiFlexItem>
            <span className="euiFormLabel">{i18n.FIELD_MAPPING_THIRD_COL}</span>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
      <FieldRowWrapper data-test-subj="case-configure-field-mapping-row-wrapper">
        {(mapping ?? defaultMapping).map(item => (
          <FieldMappingRow
            key={item.source}
            disabled={disabled}
            siemField={item.source}
            thirdPartyOptions={getThirdPartyOptions(item.source, selectedConnector.fields)}
            actionTypeOptions={actionTypeOptions}
            onChangeActionType={onChangeActionType}
            onChangeThirdParty={onChangeThirdParty}
            selectedActionType={item.actionType}
            selectedThirdParty={item.target ?? 'not_mapped'}
          />
        ))}
      </FieldRowWrapper>
    </>
  );
};

export const FieldMapping = React.memo(FieldMappingComponent);
