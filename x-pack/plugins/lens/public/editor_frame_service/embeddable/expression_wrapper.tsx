/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiIcon } from '@elastic/eui';
import {
  ExpressionRendererEvent,
  ReactExpressionRendererType,
} from 'src/plugins/expressions/public';
import { ExecutionContextSearch } from 'src/plugins/expressions';

export interface ExpressionWrapperProps {
  ExpressionRenderer: ReactExpressionRendererType;
  expression: string | null;
  searchContext: ExecutionContextSearch;
  handleEvent: (event: ExpressionRendererEvent) => void;
}

export function ExpressionWrapper({
  ExpressionRenderer: ExpressionRendererComponent,
  expression,
  searchContext,
  handleEvent,
}: ExpressionWrapperProps) {
  return (
    <I18nProvider>
      {expression === null || expression === '' ? (
        <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
          <EuiFlexItem>
            <EuiIcon type="alert" color="danger" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <FormattedMessage
                id="xpack.lens.embeddable.failure"
                defaultMessage="Visualization couldn't be displayed"
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <div className="lnsExpressionRenderer">
          <ExpressionRendererComponent
            className="lnsExpressionRenderer__component"
            padding="m"
            expression={expression}
            searchContext={searchContext}
            renderError={(error) => <div data-test-subj="expression-renderer-error">{error}</div>}
            onEvent={handleEvent}
          />
        </div>
      )}
    </I18nProvider>
  );
}
