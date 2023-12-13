/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldText,
} from '@elastic/eui';
import { useKibana } from '../../common/lib/kibana';
import { createActionTemplate } from '../lib/action_connector_api/create_action_template';

interface CodeEditorModalProps {
  template: string;
  connectorTypeId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const SaveActionTemplateModal = (props: CodeEditorModalProps) => {
  const { http } = useKibana().services;
  const { template, connectorTypeId, onClose, isOpen } = props;
  const [name, setName] = useState<string>('');

  const onCloseInternal = useCallback(() => {
    setName('');
    onClose();
  }, [onClose, setName]);

  const onSave = useCallback(async () => {
    await createActionTemplate({ http, connectorTypeId, name, template });
    onClose();
  }, [onClose, name, template, http, connectorTypeId]);

  if (!isOpen) {
    return null;
  }

  return (
    <EuiModal
      style={{
        width: '800px',
      }}
      onClose={onClose}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>Save action template</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiFormRow fullWidth id="actionTemplateName" label={`Name`}>
              <EuiFieldText
                fullWidth
                autoFocus={true}
                name="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCodeBlock language="JSON" fontSize="s">
              {template}
            </EuiCodeBlock>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton onClick={onCloseInternal} fill>
          Cancel
        </EuiButton>
        <EuiButton onClick={onSave} fill>
          Save
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
