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
import { ExecutionContextSearch } from 'src/plugins/data/public';
import { RenderMode } from 'src/plugins/expressions';
import { getOriginalRequestErrorMessage } from '../error_helper';

export interface ExpressionWrapperProps {
  ExpressionRenderer: ReactExpressionRendererType;
  expression: string | null;
  variables?: Record<string, unknown>;
  searchContext: ExecutionContextSearch;
  searchSessionId?: string;
  handleEvent: (event: ExpressionRendererEvent) => void;
  renderMode?: RenderMode;
}

export function ExpressionWrapper({
  ExpressionRenderer: ExpressionRendererComponent,
  expression,
  searchContext,
  variables,
  handleEvent,
  searchSessionId,
  renderMode,
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
            padding="s"
            variables={variables}
            expression={expression}
            searchContext={searchContext}
            searchSessionId={searchSessionId}
            renderMode={renderMode}
            renderError={(errorMessage, error) => (
              <div data-test-subj="expression-renderer-error">
                <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
                  <EuiFlexItem>
                    <EuiIcon type="alert" color="danger" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s">
                      {getOriginalRequestErrorMessage(error) || errorMessage}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </div>
            )}
            onEvent={handleEvent}
          />
        </div>
      )}
    </I18nProvider>
  );
}
