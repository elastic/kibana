/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiSpacer, EuiText } from '@elastic/eui';

export const PageLoader = ({
  title,
  body,
  icon,
}: {
  title: React.ReactElement;
  body?: React.ReactElement;
  icon: React.ReactElement;
}) => {
  return (
    <EuiFlexGroup alignItems="center" justifyContent="center" style={{ height: '65vh' }}>
      <EuiFlexItem grow={false} style={{ textAlign: 'center' }}>
        <span>{icon}</span>
        <EuiSpacer size="m" />
        <EuiTitle size="m">{title}</EuiTitle>
        <EuiSpacer size="m" />
        {body && <EuiText color="subdued">{body}</EuiText>}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
