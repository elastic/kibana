/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiThemeVars } from '@kbn/ui-theme';
import React, { ReactNode } from 'react';

interface ChatItemTitleProps {
  actions?: ReactNode;
  title: string;
}

export function ChatItemTitle({ actions, title }: ChatItemTitleProps) {
  return (
    <>
      {title}
      {actions ? (
        <div css={{ position: 'absolute', top: 4, right: euiThemeVars.euiSizeS }}>{actions}</div>
      ) : null}
    </>
  );
}
