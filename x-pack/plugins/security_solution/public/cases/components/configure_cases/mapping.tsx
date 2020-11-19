/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';

import {
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiButtonEmpty,
} from '@elastic/eui';

import * as i18n from './translations';

import { FieldMapping } from './field_mapping';
import { CasesConfigurationMapping } from '../../containers/configure/types';

export interface MappingProps {
  disabled: boolean;
  updateConnectorDisabled: boolean;
  mapping: CasesConfigurationMapping[] | null;
  connectorActionTypeId: string;
  onChangeMapping: (newMapping: CasesConfigurationMapping[]) => void;
  setEditFlyoutVisibility: () => void;
}

const EuiButtonEmptyExtended = styled(EuiButtonEmpty)`
  font-size: 12px;
  height: 24px;
`;

const MappingComponent: React.FC<MappingProps> = ({
  disabled,
  updateConnectorDisabled,
  mapping,
  onChangeMapping,
  setEditFlyoutVisibility,
  connectorActionTypeId,
}) => {
  return (
    <EuiDescribedFormGroup
      fullWidth
      title={<h3>{i18n.FIELD_MAPPING_TITLE}</h3>}
      description={i18n.FIELD_MAPPING_DESC}
      data-test-subj="case-mapping-form-group"
    >
      <EuiFormRow fullWidth data-test-subj="case-mapping-form-row">
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false} className="euiFormLabel">
            <EuiButtonEmptyExtended
              onClick={setEditFlyoutVisibility}
              disabled={updateConnectorDisabled}
              data-test-subj="case-mapping-update-connector-button"
            >
              {i18n.UPDATE_CONNECTOR}
            </EuiButtonEmptyExtended>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
      <FieldMapping
        disabled={disabled}
        connectorActionTypeId={connectorActionTypeId}
        mapping={mapping}
        onChangeMapping={onChangeMapping}
        data-test-subj="case-mapping-field"
      />
    </EuiDescribedFormGroup>
  );
};

export const Mapping = React.memo(MappingComponent);
