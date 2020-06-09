/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiCheckbox, EuiButtonEmpty, EuiText } from '@elastic/eui';

import { ComponentTemplateDeserialized } from '../../../../common';
import { TemplateContentIndicator } from '../template_content_indicator';

const hasEntries = (obj?: Record<string, any>) =>
  obj === undefined ? false : Object.keys(obj).length > 0;

interface Props {
  component: ComponentTemplateDeserialized;
  isSelectable?: boolean;
  isDragable?: boolean;
  actions?: Array<{ label: string; handler: (component: any) => void }>;
}

export const ComponentTemplatesListItem = ({ component, isSelectable = false, actions }: Props) => {
  const [checked, setChecked] = useState(false);
  const hasActions = actions && actions.length > 0;

  return (
    <div style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center">
            {isSelectable && (
              <EuiFlexItem>
                <EuiCheckbox
                  id={component.name}
                  checked={checked}
                  onChange={() => setChecked((prev) => !prev)}
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiText>{component.name}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false} style={{ flexDirection: 'row' }}>
              <TemplateContentIndicator
                settings={hasEntries(component.template.settings)}
                mappings={hasEntries(component.template.mappings)}
                aliases={hasEntries(component.template.aliases)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {/* Actions */}
        {hasActions && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              {actions!.map((action, i) => (
                <EuiFlexItem key={i}>
                  <EuiButtonEmpty
                    onClick={() => action.handler(component)}
                    data-test-subj="addPropertyButton"
                    aria-label={action.label}
                  >
                    {action.label}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </div>
  );
};
