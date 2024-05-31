/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiCodeBlock,
  EuiTitle,
  EuiButton,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { Uploader } from './uploader';

interface Props {
  onChange: ({ scriptText, fileName }: { scriptText: string; fileName: string }) => void;
  script: string;
  fileName?: string;
  isEditable?: boolean;
}

export function ScriptRecorderFields({ onChange, script, fileName, isEditable }: Props) {
  const [showScript, setShowScript] = useState(false);

  const handleUpload = useCallback(
    ({ scriptText, fileName: fileNameT }: { scriptText: string; fileName: string }) => {
      onChange({ scriptText, fileName: fileNameT });
    },
    [onChange]
  );

  return (
    <>
      <EuiSpacer size="m" />
      {isEditable && script ? (
        <EuiFormRow aria-label="Testing script" fullWidth>
          <EuiText size="s">
            <strong>{fileName}</strong>
          </EuiText>
        </EuiFormRow>
      ) : (
        <Uploader onUpload={handleUpload} />
      )}
      {script && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="syntheticsScriptRecorderFieldsShowScriptButton"
                onClick={() => setShowScript(true)}
                iconType="editorCodeBlock"
                iconSide="right"
              >
                <FormattedMessage
                  id="xpack.synthetics.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.recorder.showScriptLabel"
                  defaultMessage="Show script"
                />
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {isEditable && (
                <EuiButton
                  data-test-subj="syntheticsScriptRecorderFieldsRemoveScriptButton"
                  onClick={() => onChange({ scriptText: '', fileName: '' })}
                  iconType="trash"
                  iconSide="right"
                  color="danger"
                >
                  <FormattedMessage
                    id="xpack.synthetics.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.recorder.removeScriptLabel"
                    defaultMessage="Remove script"
                  />
                </EuiButton>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
      {showScript && (
        <EuiFlyout
          ownFocus
          onClose={() => setShowScript(false)}
          aria-labelledby="syntheticsBrowserScriptBlockHeader"
          closeButtonProps={{ 'aria-label': CLOSE_BUTTON_LABEL }}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <span id="syntheticsBrowserScriptBlockHeader">
                {fileName || PLACEHOLDER_FILE_NAME}
              </span>
            </EuiTitle>
          </EuiFlyoutHeader>
          <div style={{ height: '100%' }}>
            <EuiCodeBlock language="js" overflowHeight={'100%'} fontSize="m" isCopyable>
              {script}
            </EuiCodeBlock>
          </div>
        </EuiFlyout>
      )}
    </>
  );
}

const PLACEHOLDER_FILE_NAME = i18n.translate(
  'xpack.synthetics.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.scriptRecorder.mockFileName',
  {
    defaultMessage: 'test_script.js',
  }
);

const CLOSE_BUTTON_LABEL = i18n.translate(
  'xpack.synthetics.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.scriptRecorder.closeButtonLabel',
  {
    defaultMessage: 'Close script flyout',
  }
);
