/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiCheckbox } from '@elastic/eui';

import { ComponentTemplateDeserialized } from '../../../../common';

interface Props {
  component: ComponentTemplateDeserialized;
  isSelectable?: boolean;
  isDragable?: boolean;
  actions?: Array<{ label: string; handler: (component: any) => void }>;
}

export const ComponentTemplatesListItem = ({ component, isSelectable = false }: Props) => {
  const [checked, setChecked] = useState(false);
  return (
    <div style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup>
            {isSelectable && (
              <EuiFlexItem>
                <EuiCheckbox
                  id={component.name}
                  checked={checked}
                  onChange={() => setChecked((prev) => !prev)}
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>{component.name}</EuiFlexItem>
            <EuiFlexItem grow={false}>S M A</EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>ACTIONS</EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
