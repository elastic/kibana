/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { UseArray, useFormData } from '../../../../shared_imports';
import { RelatedIntegrationsHelpInfo } from './related_integrations_help_info';
import { RelatedIntegrationFieldRow } from './related_integration_field_row';
import * as i18n from './translations';

interface RelatedIntegrationsProps {
  path: string;
  dataTestSubj?: string;
}

export function RelatedIntegrations({ path, dataTestSubj }: RelatedIntegrationsProps): JSX.Element {
  const label = (
    <>
      {i18n.RELATED_INTEGRATIONS_LABEL}
      <RelatedIntegrationsHelpInfo />
    </>
  );
  const [formData] = useFormData();

  return (
    <UseArray path={path} initialNumberOfItems={0}>
      {({ items, addItem, removeItem }) => (
        <EuiFormRow
          label={label}
          labelAppend={
            <EuiText color="subdued" size="xs">
              {i18n.OPTIONAL}
            </EuiText>
          }
          labelType="legend"
          fullWidth
          data-test-subj={dataTestSubj}
          hasChildLabel={false}
        >
          <>
            <EuiFlexGroup direction="column" gutterSize="s">
              {items.map((item) => (
                <EuiFlexItem key={item.id} data-test-subj="relatedIntegrationRow">
                  <RelatedIntegrationFieldRow
                    item={item}
                    relatedIntegrations={formData[path] ?? []}
                    removeItem={removeItem}
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
            {items.length > 0 && <EuiSpacer size="s" />}
            <EuiButtonEmpty size="xs" iconType="plusInCircle" onClick={addItem}>
              {i18n.ADD_INTEGRATION}
            </EuiButtonEmpty>
          </>
        </EuiFormRow>
      )}
    </UseArray>
  );
}
