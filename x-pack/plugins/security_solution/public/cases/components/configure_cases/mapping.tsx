/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTextColor } from '@elastic/eui';

import { TextColor } from '@elastic/eui/src/components/text/text_color';
import * as i18n from './translations';

import { FieldMapping } from './field_mapping';
import { CaseConnectorMapping } from '../../containers/configure/types';
import { connectorsConfiguration } from '../connectors';

export interface MappingProps {
  connectorActionTypeId: string;
  isLoading: boolean;
  mappings: CaseConnectorMapping[];
}

const MappingComponent: React.FC<MappingProps> = ({
  connectorActionTypeId,
  isLoading,
  mappings,
}) => {
  const selectedConnector = useMemo(() => connectorsConfiguration[connectorActionTypeId], [
    connectorActionTypeId,
  ]);
  const fieldMappingDesc: { desc: string; color: TextColor } = useMemo(
    () =>
      mappings.length > 0 || isLoading
        ? { desc: i18n.FIELD_MAPPING_DESC(selectedConnector.name), color: 'subdued' }
        : { desc: i18n.FIELD_MAPPING_DESC_ERR(selectedConnector.name), color: 'danger' },
    [isLoading, mappings.length, selectedConnector.name]
  );
  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <h4>{i18n.FIELD_MAPPING_TITLE(selectedConnector.name)}</h4>
          <EuiTextColor data-test-subj="field-mapping-desc" color={fieldMappingDesc.color}>
            {fieldMappingDesc.desc}
          </EuiTextColor>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <FieldMapping
          connectorActionTypeId={connectorActionTypeId}
          data-test-subj="case-mappings-field"
          isLoading={isLoading}
          mappings={mappings}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const Mapping = React.memo(MappingComponent);
