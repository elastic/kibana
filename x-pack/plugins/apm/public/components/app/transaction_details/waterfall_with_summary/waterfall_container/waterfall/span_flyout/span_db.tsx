/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTitle, EuiCodeBlock } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Fragment } from 'react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import sql from 'react-syntax-highlighter/dist/cjs/languages/hljs/sql';
import { Span } from '../../../../../../../../typings/es_schemas/ui/span';

SyntaxHighlighter.registerLanguage('sql', sql);

interface Props {
  spanDb?: NonNullable<Span['span']>['db'];
}

export function SpanDatabase({ spanDb }: Props) {
  if (!spanDb || !spanDb.statement) {
    return null;
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
      <EuiSpacer size="s" />
      <EuiCodeBlock language="sql" fontSize="m" paddingSize="m">
        {spanDb.statement}
      </EuiCodeBlock>
      <EuiSpacer size="m" />
    </Fragment>
  );
}
