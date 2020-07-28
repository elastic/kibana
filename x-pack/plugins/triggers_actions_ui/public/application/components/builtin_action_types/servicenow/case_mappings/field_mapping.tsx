/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFormRow, EuiFlexItem, EuiFlexGroup, EuiSuperSelectOption } from '@elastic/eui';
import styled from 'styled-components';

import { FieldMappingRow } from './field_mapping_row';
import * as i18n from './translations';

import { setActionTypeToMapping, setThirdPartyToMapping } from './utils';
import { ThirdPartyField as ConnectorConfigurationThirdPartyField } from './types';
import { CasesConfigurationMapping } from '../types';
import { connectorConfiguration } from '../config';
import { createDefaultMapping } from '../servicenow_connectors';

const FieldRowWrapper = styled.div`
  margin-top: 8px;
  font-size: 14px;
`;

const actionTypeOptions: Array<EuiSuperSelectOption<string>> = [
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

const getThirdPartyOptions = (
  caseField: string,
  thirdPartyFields: Record<string, ConnectorConfigurationThirdPartyField>
): Array<EuiSuperSelectOption<string>> =>
  (Object.keys(thirdPartyFields) as string[]).reduce<Array<EuiSuperSelectOption<string>>>(
    (acc, key) => {
      if (thirdPartyFields[key].validSourceFields.includes(caseField)) {
        return [
          ...acc,
          {
            value: key,
            inputDisplay: <span>{thirdPartyFields[key].label}</span>,
            'data-test-subj': `dropdown-mapping-${key}`,
          },
        ];
      }
      return acc;
    },
    [
      {
        value: 'not_mapped',
        inputDisplay: i18n.MAPPING_FIELD_NOT_MAPPED,
        'data-test-subj': 'dropdown-mapping-not_mapped',
      },
    ]
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
    (caseField: string, newActionType: string) => {
      const myMapping = mapping ?? defaultMapping;
      onChangeMapping(setActionTypeToMapping(caseField, newActionType, myMapping));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mapping]
  );

  const onChangeThirdParty = useCallback(
    (caseField: string, newThirdPartyField: string) => {
      const myMapping = mapping ?? defaultMapping;
      onChangeMapping(setThirdPartyToMapping(caseField, newThirdPartyField, myMapping));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mapping]
  );

  const selectedConnector = connectorConfiguration ?? { fields: {} };
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
        {(mapping ?? defaultMapping).map((item) => (
          <FieldMappingRow
            key={`${item.source}`}
            id={`${item.source}`}
            disabled={disabled}
            securitySolutionField={item.source}
            thirdPartyOptions={getThirdPartyOptions(item.source, selectedConnector.fields as any)}
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
