/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import styled from 'styled-components';
import {
  borderRadius,
  colors,
  fontFamilyCode,
  px,
  unit,
  units
} from '../../../../../../../style/variables';

import SyntaxHighlighter, {
  registerLanguage
  // @ts-ignore
} from 'react-syntax-highlighter/dist/light';

// @ts-ignore
import { xcode } from 'react-syntax-highlighter/dist/styles';

// @ts-ignore
import sql from 'react-syntax-highlighter/dist/languages/sql';

import { EuiTitle } from '@elastic/eui';
import { DbContext } from '../../../../../../../../typings/Span';

registerLanguage('sql', sql);

const DatabaseStatement = styled.div`
  margin-top: ${px(unit)};
  padding: ${px(units.half)} ${px(unit)};
  background: ${colors.yellow};
  border-radius: ${borderRadius};
  border: 1px solid ${colors.gray4};
  font-family: ${fontFamilyCode};
`;

interface Props {
  dbContext?: DbContext;
}

export function DatabaseContext({ dbContext }: Props) {
  if (!dbContext || !dbContext.statement) {
    return null;
  }

  if (dbContext.type !== 'sql') {
    return <DatabaseStatement>{dbContext.statement}</DatabaseStatement>;
  }

  return (
    <Fragment>
      <EuiTitle size="xs">
        <h3>Database statement</h3>
      </EuiTitle>
      <DatabaseStatement>
        <SyntaxHighlighter
          language={'sql'}
          style={xcode}
          customStyle={{
            color: null,
            background: null,
            padding: null,
            lineHeight: px(unit * 1.5),
            whiteSpace: 'pre-wrap',
            overflowX: 'scroll'
          }}
        >
          {dbContext.statement}
        </SyntaxHighlighter>
      </DatabaseStatement>
    </Fragment>
  );
}
