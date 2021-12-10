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
  EuiLink,
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
import { usePolicyConfigContext } from '../contexts/policy_config_context';
import { Uploader } from './uploader';

interface Props {
  onChange: ({ scriptText, fileName }: { scriptText: string; fileName: string }) => void;
  script: string;
  fileName?: string;
}

export function ScriptRecorderFields({ onChange, script, fileName }: Props) {
  const [showScript, setShowScript] = useState(false);
  const { isEditable } = usePolicyConfigContext();

  const handleUpload = useCallback(
    ({ scriptText, fileName: fileNameT }: { scriptText: string; fileName: string }) => {
      onChange({ scriptText, fileName: fileNameT });
    },
    [onChange]
  );

  return (
    <>
      <EuiSpacer size="m" />
      <EuiLink href="https://github.com/elastic/synthetics-recorder/releases/" target="_blank">
        <FormattedMessage
          id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.zipUrl.recorderLink"
          defaultMessage="Download the Elastic Synthetics Recorder"
        />
      </EuiLink>
      <EuiSpacer size="m" />
      {isEditable && script ? (
        <EuiFormRow label="Testing script">
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
                onClick={() => setShowScript(true)}
                iconType="editorCodeBlock"
                iconSide="right"
              >
                <FormattedMessage
                  id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.zipUrl.showScriptLabel"
                  defaultMessage="Show script"
                />
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {isEditable && (
                <EuiButton
                  onClick={() => onChange({ scriptText: '', fileName: '' })}
                  iconType="trash"
                  iconSide="right"
                  color="danger"
                >
                  <FormattedMessage
                    id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.zipUrl.removeScriptLabel"
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
          closeButtonAriaLabel={CLOSE_BUTTON_LABEL}
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
  'xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.scriptRecorder.mockFileName',
  {
    defaultMessage: 'test_script.js',
  }
);

const CLOSE_BUTTON_LABEL = i18n.translate(
  'xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.scriptRecorder.closeButtonLabel',
  {
    defaultMessage: 'Close script flyout',
  }
);
