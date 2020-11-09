/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import styled from 'styled-components';

import { CasesConfigurationMapping } from '../../containers/configure/types';
import { FieldMappingRowStatic } from './field_mapping_row_static';
import * as i18n from './translations';

import { connectorsConfiguration } from '../../../common/lib/connectors/config';
import { createDefaultMapping } from '../../../common/lib/connectors/utils';

const FieldRowWrapper = styled.div`
  margin: 10px 0;
  font-size: 14px;
`;

export interface FieldMappingProps {
  connectorActionTypeId: string;
  mapping: CasesConfigurationMapping[] | null;
}

const FieldMappingComponent: React.FC<FieldMappingProps> = ({ mapping, connectorActionTypeId }) => {
  const selectedConnector = useMemo(
    () => connectorsConfiguration[connectorActionTypeId] ?? { fields: {} },
    [connectorActionTypeId]
  );
  const defaultMapping = useMemo(() => createDefaultMapping(selectedConnector.fields), [
    selectedConnector.fields,
  ]);
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
        <FieldRowWrapper data-test-subj="case-configure-field-mapping-row-wrapper">
          {(mapping ?? defaultMapping).map((item) => (
            <FieldMappingRowStatic
              key={`${item.source}`}
              securitySolutionField={item.source}
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
