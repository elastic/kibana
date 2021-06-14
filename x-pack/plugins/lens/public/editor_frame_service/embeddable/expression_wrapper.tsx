/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiIcon, EuiEmptyPrompt } from '@elastic/eui';
import {
  ExpressionRendererEvent,
  ReactExpressionRendererType,
  ReactExpressionRendererProps,
} from 'src/plugins/expressions/public';
import { ExecutionContextSearch } from 'src/plugins/data/public';
import { DefaultInspectorAdapters, RenderMode } from 'src/plugins/expressions';
import classNames from 'classnames';
import { getOriginalRequestErrorMessages } from '../error_helper';
import { ErrorMessage } from '../types';

export interface ExpressionWrapperProps {
  ExpressionRenderer: ReactExpressionRendererType;
  expression: string | null;
  errors: ErrorMessage[] | undefined;
  variables?: Record<string, unknown>;
  searchContext: ExecutionContextSearch;
  searchSessionId?: string;
  handleEvent: (event: ExpressionRendererEvent) => void;
  onData$: (
    data: unknown,
    inspectorAdapters?: Partial<DefaultInspectorAdapters> | undefined
  ) => void;
  renderMode?: RenderMode;
  syncColors?: boolean;
  hasCompatibleActions?: ReactExpressionRendererProps['hasCompatibleActions'];
  style?: React.CSSProperties;
  className?: string;
  canEdit: boolean;
  onRuntimeError: () => void;
}

interface VisualizationErrorProps {
  errors: ExpressionWrapperProps['errors'];
  canEdit: boolean;
}

export function VisualizationErrorPanel({ errors, canEdit }: VisualizationErrorProps) {
  const showMore = errors && errors.length > 1;
  const canFixInLens = canEdit && errors?.some(({ type }) => type === 'fixable');
  return (
    <div className="lnsEmbeddedError">
      <EuiEmptyPrompt
        iconType="alert"
        iconColor="danger"
        data-test-subj="embeddable-lens-failure"
        body={
          <>
            {errors ? (
              <>
                <p>{errors[0].longMessage}</p>
                {showMore && !canFixInLens ? (
                  <p>
                    <FormattedMessage
                      id="xpack.lens.embeddable.moreErrors"
                      defaultMessage="Edit in Lens editor to see more errors"
                    />
                  </p>
                ) : null}
                {canFixInLens ? (
                  <p>
                    <FormattedMessage
                      id="xpack.lens.embeddable.fixErrors"
                      defaultMessage="Edit in Lens editor to fix the error"
                    />
                  </p>
                ) : null}
              </>
            ) : (
              <p>
                <FormattedMessage
                  id="xpack.lens.embeddable.failure"
                  defaultMessage="Visualization couldn't be displayed"
                />
              </p>
            )}
          </>
        }
      />
    </div>
  );
}

export function ExpressionWrapper({
  ExpressionRenderer: ExpressionRendererComponent,
  expression,
  searchContext,
  variables,
  handleEvent,
  searchSessionId,
  onData$,
  renderMode,
  syncColors,
  hasCompatibleActions,
  style,
  className,
  errors,
  canEdit,
  onRuntimeError,
}: ExpressionWrapperProps) {
  return (
    <I18nProvider>
      {errors || expression === null || expression === '' ? (
        <VisualizationErrorPanel errors={errors} canEdit={canEdit} />
      ) : (
        <div className={classNames('lnsExpressionRenderer', className)} style={style}>
          <ExpressionRendererComponent
            className="lnsExpressionRenderer__component"
            padding="s"
            variables={variables}
            expression={expression}
            searchContext={searchContext}
            searchSessionId={searchSessionId}
            onData$={onData$}
            renderMode={renderMode}
            syncColors={syncColors}
            renderError={(errorMessage, error) => {
              onRuntimeError();
              return (
                <div data-test-subj="expression-renderer-error">
                  <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
                    <EuiFlexItem>
                      <EuiIcon type="alert" color="danger" />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      {(getOriginalRequestErrorMessages(error) || [errorMessage]).map((message) => (
                        <EuiText size="s">{message}</EuiText>
                      ))}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </div>
              );
            }}
            onEvent={handleEvent}
            hasCompatibleActions={hasCompatibleActions}
          />
        </div>
      )}
    </I18nProvider>
  );
}
