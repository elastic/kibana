/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent } from 'react';
import type { EuiMarkdownAstNodePosition } from '@elastic/eui';
import { MentionsNodeDetails } from './types';
import { EuiToolTip, EuiAvatar, useEuiTheme } from '@elastic/eui';
import { mentionsConfig } from './config';

export const mentionsMarkdownRendererComponent: FunctionComponent<
  MentionsNodeDetails & {
    position: EuiMarkdownAstNodePosition;
  }
> = ({ mention }) => {
  const match = mentionsConfig.options.find(({ label }) => label === mention);

  if (!match) {
    return <span>@{mention}</span>;
  }

  const { firstName, lastName } = match.data;
  const { label } = match;

  const content = (
    <div>
      <div>
        <EuiAvatar name={label} size="m" />
      </div>

      <div>
        <p>@{label}</p>
        <p>
          {firstName} {lastName}
        </p>
      </div>
    </div>
  );

  return (
    <EuiToolTip content={content}>
      <span>@{mention}</span>
    </EuiToolTip>
  );
};

mentionsMarkdownRendererComponent.displayName = 'mentionsMarkdownRenderer'

export const mentionsMarkdownRenderer = React.memo(mentionsMarkdownRendererComponent);
