/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiText } from '@elastic/eui';

export const Link: React.FC<{ path?: string; copy: string }> = ({ path, copy }) =>
  path ? (
    <EuiLink href={path} target="_blank" data-test-subj="panel-link">
      {copy}
    </EuiLink>
  ) : (
    <EuiText color="subdued" size="s" data-test-subj="panel-no-link">
      {copy}
    </EuiText>
  );

Link.displayName = 'Link';
