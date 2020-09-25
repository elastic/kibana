/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import { i18n } from '@kbn/i18n';
import { EuiCode } from '@elastic/eui';
import styled from 'styled-components';
import React, { memo } from 'react';

/**
 * A bold version of EuiCode to display certain titles with
 */
export const BoldCode = styled(EuiCode)`
  &.euiCodeBlock code.euiCodeBlock__code {
    font-weight: 900;
  }
`;

/**
 * A component that renders an element with breaking opportunities (`<wbr>`s)
 * spliced into text children at word boundaries.
 */
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

/**
 * A component to keep time representations in blocks so they don't wrap
 * and look bad.
 */
export const StyledTime = memo(styled('time')`
  display: inline-block;
  text-align: start;
`);

/**
 * Long formatter (to second) for DateTime
 */
export const formatter = new Intl.DateTimeFormat(i18n.getLocale(), {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/**
 * @returns {string} A nicely formatted string for a date
 */
export function formatDate(
  /** To be passed through Date->Intl.DateTimeFormat */ timestamp: ConstructorParameters<
    typeof Date
  >[0]
): string {
  const date = new Date(timestamp);
  if (isFinite(date.getTime())) {
    return formatter.format(date);
  } else {
    return i18n.translate('xpack.securitySolution.enpdoint.resolver.panelutils.invaliddate', {
      defaultMessage: 'Invalid Date',
    });
  }
}
