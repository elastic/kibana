/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiCodeBlock,
  EuiLink,
  EuiTableHeaderCell,
  EuiTableRow,
  EuiTableRowCell,
  EuiText,
} from '@elastic/eui';
import React from 'react';

/** prevents links to the new pages from accessing `window.opener` */
const REL_NOOPENER = 'noopener';

/** prevents search engine manipulation by noting the linked document is not trusted or endorsed by us */
const REL_NOFOLLOW = 'nofollow';

/** prevents the browser from sending the current address as referrer via the Referer HTTP header */
const REL_NOREFERRER = 'noreferrer';

export const markdownRenderers = {
  root: ({ children }: { children: React.ReactNode[] }) => (
    <EuiText grow={true}>{children}</EuiText>
  ),
  table: ({ children }: { children: React.ReactNode[] }) => (
    <table className="euiTable euiTable--responsive">{children}</table>
  ),
  tableRow: ({ children }: { children: React.ReactNode[] }) => (
    <EuiTableRow>{children}</EuiTableRow>
  ),
  tableCell: ({ isHeader, children }: { isHeader: boolean; children: React.ReactNode[] }) => {
    return isHeader ? (
      <EuiTableHeaderCell>{children}</EuiTableHeaderCell>
    ) : (
      <EuiTableRowCell>{children}</EuiTableRowCell>
    );
  },
  // the headings used in markdown don't match our page so mapping them to the appropriate one
  heading: ({ level, children }: { level: number; children: React.ReactNode[] }) => {
    switch (level) {
      case 1:
        return <h3>{children}</h3>;
      case 2:
        return <h4>{children}</h4>;
      case 3:
        return <h5>{children}</h5>;
      default:
        return <h6>{children}</h6>;
    }
  },
  link: ({ children, href }: { children: React.ReactNode[]; href?: string }) => (
    <EuiLink href={href} target="_blank" rel={`${REL_NOOPENER} ${REL_NOFOLLOW} ${REL_NOREFERRER}`}>
      {children}
    </EuiLink>
  ),
  code: ({ language, value }: { language: string; value: string }) => {
    return (
      <EuiCodeBlock language={language} isCopyable>
        {value}
      </EuiCodeBlock>
    );
  },
};
