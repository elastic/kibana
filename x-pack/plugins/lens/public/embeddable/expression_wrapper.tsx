/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import classNames from 'classnames';
import React from 'react';
import type { KibanaExecutionContext } from '../../../../../src/core/types/execution_context';
import type { ExecutionContextSearch } from '../../../../../src/plugins/data/common/search/expressions/kibana_context_type';
import type { DefaultInspectorAdapters } from '../../../../../src/plugins/expressions/common/execution/types';
import type { RenderMode } from '../../../../../src/plugins/expressions/common/expression_renderers/types';
import type {
  ReactExpressionRendererProps,
  ReactExpressionRendererType,
} from '../../../../../src/plugins/expressions/public/react_expression_renderer';
import type { ExpressionRendererEvent } from '../../../../../src/plugins/expressions/public/render';
import { getOriginalRequestErrorMessages } from '../editor_frame_service/error_helper';
import type { ErrorMessage } from '../editor_frame_service/types';

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
  executionContext?: KibanaExecutionContext;
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
  executionContext,
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
            executionContext={executionContext}
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
