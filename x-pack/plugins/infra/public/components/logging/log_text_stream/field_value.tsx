/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import stringify from 'json-stable-stringify';
import React from 'react';
import { JsonArray, JsonValue } from '@kbn/utility-types';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { ActiveHighlightMarker, highlightFieldValue, HighlightMarker } from './highlighting';

export const FieldValue: React.FC<{
  highlightTerms: string[];
  isActiveHighlight: boolean;
  value: JsonArray;
  render?: (value: JsonValue) => React.ReactNode;
}> = React.memo(({ highlightTerms, isActiveHighlight, value, render }) => {
  if (render) {
    return <>{render(value.length === 1 ? value[0] : value)}</>;
  }

  if (value.length === 1) {
    return (
      <>
        {highlightFieldValue(
          formatValue(value[0]),
          highlightTerms,
          isActiveHighlight ? ActiveHighlightMarker : HighlightMarker
        )}
      </>
    );
  } else if (value.length > 1) {
    return (
      <ul data-test-subj="LogEntryFieldValues">
        {value.map((entry, i) => (
          <CommaSeparatedLi
            key={`LogEntryFieldValue-${i}`}
            data-test-subj={`LogEntryFieldValue-${i}`}
          >
            {highlightFieldValue(
              formatValue(entry),
              highlightTerms,
              isActiveHighlight ? ActiveHighlightMarker : HighlightMarker
            )}
          </CommaSeparatedLi>
        ))}
      </ul>
    );
  }

  return null;
});

const formatValue = (value: JsonValue): string => {
  if (typeof value === 'string') {
    return value;
  }

  return stringify(value);
};

const CommaSeparatedLi = euiStyled.li`
  display: inline;
  &:not(:last-child) {
    margin-right: 1ex;
    &::after {
      content: ',';
    }
  }
`;
