/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCodeBlock,
  EuiLink,
  EuiTableHeaderCell,
  EuiTableRow,
  EuiTableRowCell,
} from '@elastic/eui';
import React from 'react';
import type { TransformOptions } from 'react-markdown';

/** prevents links to the new pages from accessing `window.opener` */
const REL_NOOPENER = 'noopener';

/** prevents search engine manipulation by noting the linked document is not trusted or endorsed by us */
const REL_NOFOLLOW = 'nofollow';

/** prevents the browser from sending the current address as referrer via the Referer HTTP header */
const REL_NOREFERRER = 'noreferrer';

export const markdownComponents: TransformOptions['components'] = {
  table: ({ children }) => <table className="euiTable euiTable--responsive">{children}</table>,
  tr: ({ children }) => <EuiTableRow>{children}</EuiTableRow>,
  th: ({ children }) => <EuiTableHeaderCell>{children}</EuiTableHeaderCell>,
  td: ({ children }) => <EuiTableRowCell>{children}</EuiTableRowCell>,
  // the headings used in markdown don't match our page so mapping them to the appropriate one
  h1: ({ children }) => <h3>{children}</h3>,
  h2: ({ children }) => <h4>{children}</h4>,
  h3: ({ children }) => <h5>{children}</h5>,
  h4: ({ children }) => <h6>{children}</h6>,
  h5: ({ children }) => <h6>{children}</h6>,
  h6: ({ children }) => <h6>{children}</h6>,
  link: ({ children, href }: { children: React.ReactNode[]; href?: string }) => (
    <EuiLink href={href} target="_blank" rel={`${REL_NOOPENER} ${REL_NOFOLLOW} ${REL_NOREFERRER}`}>
      {children}
    </EuiLink>
  ),
  pre: ({ children, node, ...props }) => {
    if (node.children[0]?.tagName === 'code') return children;

    return <pre {...props}>{children}</pre>;
  },
  code: ({ node, inline, className, children, ...props }) => {
    if (inline) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }

    const match = /language-(\w+)/.exec(className || '');

    const parsedLang = match?.[1];

    return <EuiCodeBlock language={parsedLang} isCopyable children={children.join('')} />;
  },
};
