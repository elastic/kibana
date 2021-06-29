/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { tint } from 'polished';
import React, { Fragment } from 'react';
import sql from 'react-syntax-highlighter/dist/cjs/languages/hljs/sql';
import xcode from 'react-syntax-highlighter/dist/cjs/styles/hljs/xcode';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { euiStyled } from '../../../../../../../../../../../src/plugins/kibana_react/common';
import { Span } from '../../../../../../../../typings/es_schemas/ui/span';
import {
  borderRadius,
  fontFamilyCode,
  fontSize,
  px,
  unit,
  units,
} from '../../../../../../../style/variables';
import { TruncateHeightSection } from './TruncateHeightSection';

SyntaxHighlighter.registerLanguage('sql', sql);

const DatabaseStatement = euiStyled.div`
  padding: ${px(units.half)} ${px(unit)};
  background: ${({ theme }) => tint(0.9, theme.eui.euiColorWarning)};
  border-radius: ${borderRadius};
  border: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
  font-family: ${fontFamilyCode};
  font-size: ${fontSize};
`;

const dbSyntaxLineHeight = unit * 1.5;

interface Props {
  dbContext?: NonNullable<Span['span']>['db'];
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
              defaultMessage: 'Database statement',
            }
          )}
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <DatabaseStatement>
        <TruncateHeightSection previewHeight={10 * dbSyntaxLineHeight}>
          <SyntaxHighlighter
            language={'sql'}
            style={xcode}
            customStyle={{
              color: null,
              background: null,
              padding: null,
              lineHeight: px(dbSyntaxLineHeight),
              whiteSpace: 'pre-wrap',
              overflowX: 'scroll',
            }}
          >
            {dbContext.statement}
          </SyntaxHighlighter>
        </TruncateHeightSection>
      </DatabaseStatement>
      <EuiSpacer size="l" />
    </Fragment>
  );
}
