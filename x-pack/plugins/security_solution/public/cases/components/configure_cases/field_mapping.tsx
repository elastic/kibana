/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import styled from 'styled-components';

import { FieldMappingRowStatic } from './field_mapping_row_static';
import * as i18n from './translations';

import { connectorsConfiguration } from '../../../common/lib/connectors/config';
import { CaseConnectorMapping } from '../../containers/configure/types';

const FieldRowWrapper = styled.div`
  margin: 10px 0;
  font-size: 14px;
`;

export interface FieldMappingProps {
  connectorActionTypeId: string;
  isLoading: boolean;
  mappings: CaseConnectorMapping[];
}

const FieldMappingComponent: React.FC<FieldMappingProps> = ({
  connectorActionTypeId,
  isLoading,
  mappings,
}) => {
  const selectedConnector = useMemo(
    () => connectorsConfiguration[connectorActionTypeId] ?? { fields: {} },
    [connectorActionTypeId]
  );
  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>
        {' '}
        <EuiFlexGroup>
          <EuiFlexItem>
            <span className="euiFormLabel">{i18n.FIELD_MAPPING_FIRST_COL}</span>
          </EuiFlexItem>
          <EuiFlexItem>
            <span className="euiFormLabel">
              {i18n.FIELD_MAPPING_SECOND_COL(selectedConnector.name)}
            </span>
          </EuiFlexItem>
          <EuiFlexItem>
            <span className="euiFormLabel">{i18n.FIELD_MAPPING_THIRD_COL}</span>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <FieldRowWrapper data-test-subj="case-configure-field-mappings-row-wrapper">
          {mappings.map((item) => (
            <FieldMappingRowStatic
              key={`${item.source}`}
              securitySolutionField={item.source}
              isLoading={isLoading}
              selectedActionType={item.actionType}
              selectedThirdParty={item.target ?? 'not_mapped'}
            />
          ))}
        </FieldRowWrapper>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const FieldMapping = React.memo(FieldMappingComponent);
