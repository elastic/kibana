/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, FunctionComponent } from 'react';
import { EuiLink, EuiText } from '@elastic/eui';

interface Props {
  text: string;
  charLimit?: number;
}

const DEFAULT_CHAR_LIMIT = 25;

export const ExpandableText: FunctionComponent<Props> = ({
  text,
  charLimit = DEFAULT_CHAR_LIMIT,
}) => {
  const [isExpanded, setExpanded] = useState(false);
  const exceedsCharLimit = text.length > charLimit;

  const processedText = exceedsCharLimit
    ? isExpanded
      ? text
      : text.substr(0, charLimit) + '...'
    : text;

  return (
    <EuiText size="s">
      {processedText}
      {exceedsCharLimit && (
        <>
          &nbsp;
          <EuiLink onClick={() => setExpanded(!isExpanded)}>{isExpanded ? 'Less' : 'More'}</EuiLink>
        </>
      )}
    </EuiText>
  );
};
