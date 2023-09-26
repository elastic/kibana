/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCode,
  EuiCodeBlock,
  EuiLink,
  EuiTableHeaderCell,
  EuiTable,
  EuiTableRow,
  EuiTableRowCell,
  EuiIcon,
} from '@elastic/eui';
import React from 'react';
import type { TransformOptions } from 'react-markdown';

import { getAnchorId } from './overview';

/** prevents links to the new pages from accessing `window.opener` */
const REL_NOOPENER = 'noopener';

/** prevents search engine manipulation by noting the linked document is not trusted or endorsed by us */
const REL_NOFOLLOW = 'nofollow';

/** prevents the browser from sending the current address as referrer via the Referer HTTP header */
const REL_NOREFERRER = 'noreferrer';

// Maps deprecated code block languages to supported ones in prism.js
const CODE_LANGUAGE_OVERRIDES: Record<string, string> = {
  $json: 'json',
  $yml: 'yml',
};

export const markdownRenderers: TransformOptions['components'] = {
  table: ({ children }) => (
    <EuiTable className="euiEuiTable euiTable--responsive">{children}</EuiTable>
  ),
  tr: ({ children }) => <EuiTableRow>{children}</EuiTableRow>,
  th: ({ children }) => <EuiTableHeaderCell>{children}</EuiTableHeaderCell>,
  td: ({ children }) => <EuiTableRowCell>{children}</EuiTableRowCell>,
  // the headings used in markdown don't match our page so mapping them to the appropriate one
  h1: ({ children }) => {
    const id = getAnchorId(children[0]?.toString());
    return (
      <h3 id={id}>
        {children}
        &nbsp;
        <a href={`#${id}`}>
          <EuiIcon type="link" aria-label="anchor-h4" />
        </a>
      </h3>
    );
  },
  h2: ({ children }) => {
    const id = getAnchorId(children[0]?.toString());
    return (
      <h4 id={id}>
        {children}
        &nbsp;
        <a href={`#${id}`}>
          <EuiIcon type="link" aria-label="anchor-h4" />
        </a>
      </h4>
    );
  },
  h3: ({ children }) => {
    const id = getAnchorId(children[0]?.toString());
    return (
      <h5 id={id}>
        {children}
        &nbsp;
        <a href={`#${id}`}>
          <EuiIcon type="link" aria-label="anchor-h5" />
        </a>
      </h5>
    );
  },
  h4: ({ children }) => {
    const id = getAnchorId(children[0]?.toString());
    return (
      <h6 id={id}>
        {children}
        &nbsp;
        <a href={`#${id}`}>
          <EuiIcon type="link" aria-label="anchor-h5" />
        </a>
      </h6>
    );
  },
  h5: ({ children }) => <h6>{children}</h6>,
  h6: ({ children }) => <h6>{children}</h6>,
  link: ({ children, href }: { children: React.ReactNode[]; href?: string }) => (
    <EuiLink href={href} target="_blank" rel={`${REL_NOOPENER} ${REL_NOFOLLOW} ${REL_NOREFERRER}`}>
      {children}
    </EuiLink>
  ),
  code: ({ className, children, inline }) => {
    let parsedLang = /language-(\w+)/.exec(className || '')?.[1] ?? '';

    // Some integrations export code block content that includes language tags that have since
    // been removed or deprecated in `prism.js`, the upstream depedency that handles syntax highlighting
    // in EuiCodeBlock components
    const languageOverride = parsedLang ? CODE_LANGUAGE_OVERRIDES[parsedLang] : undefined;

    if (languageOverride) {
      parsedLang = languageOverride;
    }

    if (inline) {
      return <EuiCode>{children}</EuiCode>;
    }
    return (
      <EuiCodeBlock language={parsedLang} overflowHeight={500} isCopyable>
        {children}
      </EuiCodeBlock>
    );
  },
};
