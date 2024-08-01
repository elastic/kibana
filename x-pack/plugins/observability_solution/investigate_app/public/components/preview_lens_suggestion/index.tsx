/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiPanel } from '@elastic/eui';
import { css } from '@emotion/css';
import { useKibana } from '../../hooks/use_kibana';

function Container({ children }: { children: React.ReactNode }) {
  return (
    <EuiFlexGroup direction="row" alignItems="center" justifyContent="center">
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
}

const panelContainerClassName = css`
  overflow: clip auto;
  height: 100%;
`;

const panelContentClassName = css`
  height: 100%;
  overflow: clip auto;
  > div {
    height: 100%;
  }
`;

export function PreviewLensSuggestion({
  input,
  loading,
  error,
}: {
  input: TypedLensByValueInput;
  loading: boolean;
  error?: Error;
}) {
  const {
    dependencies: {
      start: { lens },
    },
  } = useKibana();
  if (loading) {
    return (
      <Container>
        <EuiLoadingSpinner />
      </Container>
    );
  }

  return (
    <EuiPanel hasBorder={false} hasShadow={true} className={panelContainerClassName}>
      <div className={panelContentClassName}>
        <lens.EmbeddableComponent {...input} />
      </div>
    </EuiPanel>
  );
}
