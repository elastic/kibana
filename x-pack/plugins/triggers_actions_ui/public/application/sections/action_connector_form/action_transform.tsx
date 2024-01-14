/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiSpacer,
  EuiSwitch,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFormRow,
  EuiFlexItem,
  EuiButton,
} from '@elastic/eui';
import { CodeEditorModal } from '../../components';

interface ActionTransformProps {
  state?: string;
  onChange: (transform?: string) => void;
}

export const ActionTransform = ({ state, onChange }: ActionTransformProps) => {
  const [transform, setTransform] = useState(state);
  const [transformEnabled, setTransformEnabled] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const toggleTransform = useCallback(() => {
    setTransformEnabled(!transformEnabled);
    onChange(state ? undefined : transform);
  }, [state, transform, onChange, transformEnabled, setTransformEnabled]);

  const onCodeChange = useCallback(
    (code: string) => {
      onChange(code.trim());
    },
    [onChange]
  );

  useEffect(() => {
    setTransformEnabled(Boolean(state));
    setTransform(state ?? 'console.log("your code appears here!");');
  }, [state]);

  return (
    <>
      <EuiSwitch
        label={i18n.translate(
          'xpack.triggersActionsUI.sections.actionTypeForm.actionTransformToggleLabel',
          {
            defaultMessage: 'Apply transform to action',
          }
        )}
        checked={transformEnabled}
        onChange={toggleTransform}
        data-test-subj="actionTransformQueryToggle"
      />
      {transformEnabled && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <EuiFormRow fullWidth>
                <EuiCodeBlock language="javascript" fontSize="m" paddingSize="m">
                  {transform}
                </EuiCodeBlock>
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiButton color="primary" onClick={() => setIsModalOpen(true)}>
                    Edit code
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <CodeEditorModal
            isOpen={isModalOpen}
            title="Define transform"
            code={transform ?? ''}
            onChange={onCodeChange}
            onClose={() => setIsModalOpen(false)}
          />
        </>
      )}
    </>
  );
};
