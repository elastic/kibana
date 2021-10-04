/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';

import {
  EuiLink,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiCodeBlock,
  EuiTitle,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';
import { Uploader } from './uploader';

interface Props {
  onChange: (script: string) => void;
  script: string;
}

export function ScriptRecorderFields({ onChange, script }: Props) {
  const [showScript, setShowScript] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleUpload = useCallback(
    ({ scriptText, scriptName }: { scriptText: string; scriptName: string }) => {
      setFileName(scriptName);
      onChange(scriptText);
    },
    [onChange]
  );

  return (
    <>
      <EuiSpacer size="m" />
      <EuiLink href="https://github.com/elastic/synthetics-recorder/releases/" target="_blank">
        Download the Elastic Synthetics Recorder
      </EuiLink>
      <EuiSpacer size="m" />
      <Uploader onUpload={handleUpload} />
      {script && (
        <EuiButtonEmpty
          onClick={() => setShowScript(true)}
          iconType="editorCodeBlock"
          iconSide="right"
        >
          Show script
        </EuiButtonEmpty>
      )}
      {showScript && (
        <EuiFlyout
          ownFocus
          onClose={() => setShowScript(false)}
          aria-labelledby="syntheticsBrowerScriptBlockHeader"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <span id="syntheticsBrowerScriptBlockHeader">{fileName}</span>
            </EuiTitle>
          </EuiFlyoutHeader>
          <div style={{ height: '100%' }}>
            <EuiCodeBlock
              language="js"
              overflowHeight={'100%'}
              fontSize="m"
              isCopyable
              isVirtualized
            >
              {script}
            </EuiCodeBlock>
          </div>
        </EuiFlyout>
      )}
    </>
  );
}
