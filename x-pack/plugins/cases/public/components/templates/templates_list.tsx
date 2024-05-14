/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import type { CasesConfigurationUITemplate } from '../../../common/ui';

export interface Props {
  templates: CasesConfigurationUITemplate[];
  // onDeleteCustomField: (key: string) => void;
  // onEditCustomField: (key: string) => void;
}

const TemplatesListComponent: React.FC<Props> = (props) => {
  const { templates } = props;
  const [selectedItem, setSelectedItem] = useState<CasesConfigurationUITemplate | null>(null);

  return templates.length ? (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexStart" data-test-subj="templates-list">
        <EuiFlexItem>
          {templates.map((template) => (
            <React.Fragment key={template.key}>
              <EuiPanel
                paddingSize="s"
                data-test-subj={`custom-field-${template.key}`}
                hasShadow={false}
              >
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={true}>
                    <EuiFlexGroup alignItems="center" gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <EuiText>
                          <h4>{template.name}</h4>
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  {/* <EuiFlexItem grow={false}>
                    <EuiFlexGroup alignItems="flexEnd" gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          data-test-subj={`${customField.key}-custom-field-edit`}
                          aria-label={`${customField.key}-custom-field-edit`}
                          iconType="pencil"
                          color="primary"
                          onClick={() => onEditCustomField(customField.key)}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          data-test-subj={`${customField.key}-custom-field-delete`}
                          aria-label={`${customField.key}-custom-field-delete`}
                          iconType="minusInCircle"
                          color="danger"
                          onClick={() => setSelectedItem(customField)}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem> */}
                </EuiFlexGroup>
              </EuiPanel>
              <EuiSpacer size="s" />
            </React.Fragment>
          ))}
        </EuiFlexItem>
        {/* {showModal && selectedItem ? (
          <DeleteConfirmationModal
            label={selectedItem.label}
            onCancel={onCancel}
            onConfirm={onConfirm}
          />
        ) : null} */}
      </EuiFlexGroup>
    </>
  ) : null;
};

TemplatesListComponent.displayName = 'TemplatesList';

export const TemplatesList = React.memo(TemplatesListComponent);
