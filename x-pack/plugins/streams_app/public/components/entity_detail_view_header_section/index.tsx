/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiText } from '@elastic/eui';
import { css } from '@emotion/css';
import React from 'react';

export function EntityDetailViewHeaderSection({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiText
        className={css`
          font-weight: 600;
        `}
      >
        {title}
      </EuiText>
      {children}
    </EuiFlexGroup>
  );
}
