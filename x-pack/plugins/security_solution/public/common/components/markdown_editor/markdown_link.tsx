/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiLink, EuiLinkAnchorProps } from '@elastic/eui';

type MarkdownLinkProps = { disableLinks?: boolean } & EuiLinkAnchorProps;

const MarkdownLinkComponent: React.FC<MarkdownLinkProps> = ({
  disableLinks,
  href,
  target,
  children,
  ...props
}) => (
  <>
    {disableLinks ? (
      <span>{children}</span>
    ) : (
      <EuiLink
        {...props}
        target="_blank"
        data-test-subj="markdown-link"
        href={disableLinks ? undefined : href}
        rel="nofollow"
      >
        {children}
      </EuiLink>
    )}
  </>
);

export const MarkdownLink = memo(MarkdownLinkComponent);
