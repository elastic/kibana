/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

interface AbbreviatedValueProps {
  value: string;
  abbreviation: string;
  title: string;
}

/**
 * Renders a formatted value with its unit abbreviation wrapped in an
 * <abbr> element for screen reader accessibility (WCAG 4.1.2).
 *
 * For example, "1.0 tpm" becomes: 1.0 <abbr title="transactions per minute">tpm</abbr>
 */
export function AbbreviatedValue({ value, abbreviation, title }: AbbreviatedValueProps) {
  const suffix = ` ${abbreviation}`;
  if (!value.endsWith(suffix)) {
    return <>{value}</>;
  }

  const numericPart = value.slice(0, -suffix.length);

  return (
    <>
      {numericPart}{' '}
      <abbr title={title}>{abbreviation}</abbr>
    </>
  );
}
