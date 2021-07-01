/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiCopy } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  commands: string;
}
export function CopyCommands({ commands }: Props) {
  return (
    <EuiCopy textToCopy={commands}>
      {(copy) => (
        <EuiButton size="s" onClick={copy}>
          {i18n.translate('xpack.apm.tutorial.copySnippet', {
            defaultMessage: 'Copy snippet',
          })}
        </EuiButton>
      )}
    </EuiCopy>
  );
}
