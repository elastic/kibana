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
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import sql from 'react-syntax-highlighter/dist/cjs/languages/hljs/sql';
import xcode from 'react-syntax-highlighter/dist/cjs/styles/hljs/xcode';
import { euiStyled } from '../../../../../../../../../../../src/plugins/kibana_react/common';
import { Span } from '../../../../../../../../typings/es_schemas/ui/span';
import { useTheme } from '../../../../../../../hooks/use_theme';
import { TruncateHeightSection } from './truncate_height_section';

SyntaxHighlighter.registerLanguage('sql', sql);

const DatabaseStatement = euiStyled.div`
  padding: ${({ theme }) =>
    `${theme.eui.paddingSizes.s} ${theme.eui.paddingSizes.m}`};
  background: ${({ theme }) => tint(0.9, theme.eui.euiColorWarning)};
  border-radius: ${({ theme }) => theme.eui.euiBorderRadiusSmall};
  border: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
  font-family: ${({ theme }) => theme.eui.euiCodeFontFamily};
  font-size: ${({ theme }) => theme.eui.euiFontSizeS};
`;

interface Props {
  spanDb?: NonNullable<Span['span']>['db'];
}

export function SpanDatabase({ spanDb }: Props) {
  const theme = useTheme();
  const dbSyntaxLineHeight = theme.eui.euiSizeL;
  const previewHeight = 240; // 10 * dbSyntaxLineHeight

  if (!spanDb || !spanDb.statement) {
    return null;
  }

  if (spanDb.type !== 'sql') {
    return <DatabaseStatement>{spanDb.statement}</DatabaseStatement>;
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
        <TruncateHeightSection previewHeight={previewHeight}>
          <SyntaxHighlighter
            language={'sql'}
            style={xcode}
            customStyle={{
              color: null,
              background: null,
              padding: null,
              lineHeight: dbSyntaxLineHeight,
              whiteSpace: 'pre-wrap',
              overflowX: 'scroll',
            }}
          >
            {spanDb.statement}
          </SyntaxHighlighter>
        </TruncateHeightSection>
      </DatabaseStatement>
      <EuiSpacer size="l" />
    </Fragment>
  );
}
