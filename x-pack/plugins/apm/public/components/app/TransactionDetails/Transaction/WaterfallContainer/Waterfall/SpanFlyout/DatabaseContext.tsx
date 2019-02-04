/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiTitle } from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import React, { Fragment } from 'react';
// @ts-ignore
import sql from 'react-syntax-highlighter/dist/languages/sql';
import SyntaxHighlighter, {
  registerLanguage
  // @ts-ignore
} from 'react-syntax-highlighter/dist/light';
// @ts-ignore
import { xcode } from 'react-syntax-highlighter/dist/styles';
import styled from 'styled-components';
import { Span } from 'x-pack/plugins/apm/typings/es_schemas/Span';
import {
  borderRadius,
  colors,
  fontFamilyCode,
  px,
  unit,
  units
} from '../../../../../../../style/variables';

registerLanguage('sql', sql);

const DatabaseStatement = styled.div`
  padding: ${px(units.half)} ${px(unit)};
  background: ${colors.yellow};
  border-radius: ${borderRadius};
  border: 1px solid ${theme.euiColorLightShade};
  font-family: ${fontFamilyCode};
`;

interface Props {
  dbContext?: NonNullable<Span['context']>['db'];
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
        <h3>
          {i18n.translate(
            'xpack.apm.transactionDetails.spanFlyout.databaseStatementTitle',
            {
              defaultMessage: 'Database statement'
            }
          )}
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
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
      <EuiSpacer size="l" />
    </Fragment>
  );
}
