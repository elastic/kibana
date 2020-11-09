/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';

import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiText, EuiTextColor } from '@elastic/eui';

import * as i18n from './translations';

import { FieldMapping } from './field_mapping';
import { CasesConfigurationMapping } from '../../containers/configure/types';
import { connectorsConfiguration } from '../../../common/lib/connectors/config';

export interface MappingProps {
  connectorActionTypeId: string;
  mapping: CasesConfigurationMapping[] | null;
  setEditFlyoutVisibility: () => void;
  updateFieldMappingsDisabled: boolean;
}

const EuiButtonEmptyExtended = styled(EuiButtonEmpty)`
  font-size: 12px;
  height: 24px;
`;
const MappingComponent: React.FC<MappingProps> = ({
  connectorActionTypeId,
  mapping,
  setEditFlyoutVisibility,
  updateFieldMappingsDisabled,
}) => {
  const selectedConnector = useMemo(() => connectorsConfiguration[connectorActionTypeId], [
    connectorActionTypeId,
  ]);
  return (
    <EuiFlexGroup direction="column" gutterSize="none" className={'poop'}>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <h4>{i18n.FIELD_MAPPING_TITLE(selectedConnector.name)}</h4>
          <EuiTextColor color="subdued">
            {i18n.FIELD_MAPPING_DESC(selectedConnector.name)}
          </EuiTextColor>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiButtonEmptyExtended
              data-test-subj="case-mapping-update-connector-button"
              disabled={updateFieldMappingsDisabled}
              onClick={setEditFlyoutVisibility}
            >
              {i18n.UPDATE_FIELD_MAPPINGS}
            </EuiButtonEmptyExtended>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <FieldMapping
          connectorActionTypeId={connectorActionTypeId}
          data-test-subj="case-mapping-field"
          mapping={mapping}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const Mapping = React.memo(MappingComponent);
