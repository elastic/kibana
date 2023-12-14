/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
} from '@elastic/eui';

interface CodeEditorModalProps {
  code: string;
  title: string;
  isOpen: boolean;
  onChange: (code: string) => void;
  onClose: () => void;
}

export const CodeEditorModal = (props: CodeEditorModalProps) => {
  const { code, title, onChange, onClose, isOpen } = props;

  const [codeInternal, setCodeInternal] = useState<string>('');

  const onChangeInternal = useCallback((newCode: string) => {
    setCodeInternal(newCode);
  }, []);

  const onCloseInternal = useCallback(() => {
    onChange(codeInternal);
    onClose();
  }, [onChange, onClose, codeInternal]);

  useEffect(() => {
    setCodeInternal(code);
  }, [code]);

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
        <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <CodeEditor
          languageId="javascript"
          options={{
            lineNumbers: 'on',
            fontSize: 14,
            scrollBeyondLastLine: false,
            folding: true,
            wordWrap: 'on',
            wrappingIndent: 'indent',
            automaticLayout: true,
          }}
          value={codeInternal}
          width="100%"
          height="600px"
          onChange={onChangeInternal}
          allowFullScreen
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton onClick={onCloseInternal} fill>
          Close
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
