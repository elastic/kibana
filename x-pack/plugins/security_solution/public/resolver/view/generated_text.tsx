/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

/**
 * A component that renders an element with breaking opportunities (`<wbr>`s)
 * spliced into text children at word boundaries.
 */
// eslint-disable-next-line react/display-name
export const GeneratedText = React.memo(function ({ children }) {
  return <>{processedValue()}</>;

  function processedValue() {
    return React.Children.map(children, (child) => {
      if (typeof child === 'string') {
        const valueSplitByWordBoundaries = child.split(/\b/);

        if (valueSplitByWordBoundaries.length < 2) {
          return valueSplitByWordBoundaries[0];
        }

        return [
          valueSplitByWordBoundaries[0],
          ...valueSplitByWordBoundaries
            .splice(1)
            .reduce(function (generatedTextMemo: Array<string | JSX.Element>, value) {
              return [...generatedTextMemo, value, <wbr />];
            }, []),
        ];
      } else {
        return child;
      }
    });
  }
});
