/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiLink, EuiLinkAnchorProps, EuiToolTip } from '@elastic/eui';

type MarkdownLinkProps = { disableLinks?: boolean } & EuiLinkAnchorProps;

/** prevents search engine manipulation by noting the linked document is not trusted or endorsed by us */
const REL_NOFOLLOW = 'nofollow';

const MarkdownLinkComponent: React.FC<MarkdownLinkProps> = ({
  disableLinks,
  href,
  target,
  children,
  ...props
}) => (
  <EuiToolTip content={href}>
    <EuiLink
      href={disableLinks ? undefined : href}
      data-test-subj="markdown-link"
      rel={`${REL_NOFOLLOW}`}
      target="_blank"
    >
      {children}
    </EuiLink>
  </EuiToolTip>
);

export const MarkdownLink = memo(MarkdownLinkComponent);
