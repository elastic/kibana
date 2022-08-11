/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { once } from 'lodash';
import React, { useEffect, useState } from 'react';
import { EQLCodeEditorProps } from './types';

const loadEqlCodeEditor = once(() => import('.').then((m) => m.EQLCodeEditor));

type EQLCodeEditorComponentType = Awaited<ReturnType<typeof loadEqlCodeEditor>>;

export function LazilyLoadedEQLCodeEditor(props: EQLCodeEditorProps) {
  const [EQLCodeEditor, setEQLCodeEditor] = useState<
    EQLCodeEditorComponentType | undefined
  >();

  useEffect(() => {
    loadEqlCodeEditor().then((editor) => {
      setEQLCodeEditor(() => {
        return editor;
      });
    });
  }, []);

  return EQLCodeEditor ? (
    <EQLCodeEditor {...props} />
  ) : (
    <EuiFlexGroup alignItems="center" justifyContent="center">
      <EuiFlexItem>
        <EuiLoadingSpinner size="s" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
