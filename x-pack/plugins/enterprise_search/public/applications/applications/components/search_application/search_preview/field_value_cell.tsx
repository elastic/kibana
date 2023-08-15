/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { css } from '@emotion/react';

import { useEuiTheme, transparentize } from '@elastic/eui';

import { FieldValue, isFieldValue } from './convert_results';

export interface FieldValueCellProps {
  value: FieldValue | string | number | boolean | null;
}

export const FieldValueCell: React.FC<FieldValueCellProps> = ({ value }) => {
  const { euiTheme, colorMode } = useEuiTheme();

  if (isFieldValue(value)) {
    if (value.snippet) {
      const [snippet] = value.snippet;
      // https://github.com/elastic/eui/blob/c4afd758e4c42ba6b12ea58ccfd6486d5f544afb/src/components/mark/mark.styles.ts#L29-L36
      const transparency = { DARK: 0.3, LIGHT: 0.1 };
      return (
        <span
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: snippet }}
          css={css`
            & em {
              font-style: normal;
              font-weight: ${euiTheme.font.weight.bold};
              background-color: ${transparentize(euiTheme.colors.primary, transparency[colorMode])};
              color: ${euiTheme.colors.text};
            }
          `}
        />
      );
    }
    return (
      <FieldValueCell value={value.raw as Exclude<FieldValueCellProps['value'], FieldValue>} />
    );
  }

  if (typeof value === 'string') {
    return <span>{value}</span>;
  }

  return <span>{JSON.stringify(value)}</span>;
};
