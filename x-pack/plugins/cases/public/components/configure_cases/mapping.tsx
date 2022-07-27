/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTextColor } from '@elastic/eui';

import { TextColor } from '@elastic/eui/src/components/text/text_color';
import { ConnectorTypes } from '../../../common/api';
import * as i18n from './translations';

import { FieldMapping } from './field_mapping';
import { CaseConnectorMapping } from '../../containers/configure/types';

export interface MappingProps {
  actionTypeName: string;
  connectorType: ConnectorTypes;
  isLoading: boolean;
  mappings: CaseConnectorMapping[];
}

const MappingComponent: React.FC<MappingProps> = ({
  actionTypeName,
  connectorType,
  isLoading,
  mappings,
}) => {
  const fieldMappingDesc: { desc: string; color: TextColor } = useMemo(
    () =>
      mappings.length > 0 || isLoading
        ? {
            desc: i18n.FIELD_MAPPING_DESC(actionTypeName),
            color: 'subdued',
          }
        : connectorType === ConnectorTypes.casesWebhook
        ? {
            desc: i18n.CASES_WEBHOOK_MAPPINGS,
            color: 'subdued',
          }
        : {
            desc: i18n.FIELD_MAPPING_DESC_ERR(actionTypeName),
            color: 'danger',
          },
    [mappings.length, isLoading, actionTypeName, connectorType]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiText size="xs" data-test-subj="field-mapping-text">
          <h4>{i18n.FIELD_MAPPING_TITLE(actionTypeName)}</h4>
          <EuiTextColor data-test-subj="field-mapping-desc" color={fieldMappingDesc.color}>
            {fieldMappingDesc.desc}
          </EuiTextColor>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <FieldMapping
          actionTypeName={actionTypeName}
          data-test-subj="case-mappings-field"
          isLoading={isLoading}
          mappings={mappings}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
MappingComponent.displayName = 'Mapping';

export const Mapping = React.memo(MappingComponent);
