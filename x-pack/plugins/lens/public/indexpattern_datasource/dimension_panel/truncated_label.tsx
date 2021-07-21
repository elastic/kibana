/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './field_select.scss';
import React from 'react';
import { EuiMark } from '@elastic/eui';
import { EuiHighlight } from '@elastic/eui';

export const TruncatedLabel = ({
  label,
  length,
  search,
}: {
  label: string;
  length: number;
  search: string;
}) => {
  if (label.length <= length) return <EuiHighlight search={search}>{label}</EuiHighlight>;

  const separator = '...';
  let truncLen = length - separator.length;
  const searchPosition = label.indexOf(search);

  if (!search || searchPosition === -1) {
    const frontChars = Math.ceil(truncLen / 2);
    const backChars = Math.floor(truncLen / 2);
    return (
      <span>
        {label.substr(0, frontChars) + separator + label.substr(label.length - backChars)}
      </span>
    );
  }

  let constructedLabel;

  if (searchPosition === 0) {
    // search phrase at the beginning
    constructedLabel = `${label.substr(0, truncLen)}${separator}`;
  } else {
    if (truncLen > label.length - searchPosition) {
      // search phrase close to the end or at the end
      constructedLabel = `${separator}${label.substr(label.length - truncLen)}`;
    } else {
      truncLen = truncLen - separator.length;
      constructedLabel = `${separator}${label.substr(searchPosition, truncLen)}${separator}`;
    }
  }

  return search.length <= truncLen ? (
    <EuiHighlight search={search}>{constructedLabel}</EuiHighlight>
  ) : (
    <EuiMark>{constructedLabel}</EuiMark>
  );
};
