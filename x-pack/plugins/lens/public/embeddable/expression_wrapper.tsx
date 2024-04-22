/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import {
  ExpressionRendererEvent,
  ReactExpressionRendererProps,
  ReactExpressionRendererType,
} from '@kbn/expressions-plugin/public';
import type { KibanaExecutionContext } from '@kbn/core/public';
import type { ExecutionContextSearch } from '@kbn/es-query';
import { DefaultInspectorAdapters, RenderMode } from '@kbn/expressions-plugin/common';
import classNames from 'classnames';
import { getOriginalRequestErrorMessages } from '../editor_frame_service/error_helper';
import { LensInspector } from '../lens_inspector_service';
import { AddUserMessages } from '../types';

export interface ExpressionWrapperProps {
  ExpressionRenderer: ReactExpressionRendererType;
  expression: string | null;
  variables?: Record<string, unknown>;
  interactive?: boolean;
  searchContext: ExecutionContextSearch;
  searchSessionId?: string;
  handleEvent: (event: ExpressionRendererEvent) => void;
  onData$: (
    data: unknown,
    inspectorAdapters?: Partial<DefaultInspectorAdapters> | undefined
  ) => void;
  onRender$: () => void;
  renderMode?: RenderMode;
  syncColors?: boolean;
  syncTooltips?: boolean;
  syncCursor?: boolean;
  hasCompatibleActions?: ReactExpressionRendererProps['hasCompatibleActions'];
  getCompatibleCellValueActions?: ReactExpressionRendererProps['getCompatibleCellValueActions'];
  style?: React.CSSProperties;
  className?: string;
  addUserMessages: AddUserMessages;
  onRuntimeError: (error: Error) => void;
  executionContext?: KibanaExecutionContext;
  lensInspector: LensInspector;
  noPadding?: boolean;
  abortController?: AbortController;
}

export function ExpressionWrapper({
  ExpressionRenderer: ExpressionRendererComponent,
  expression,
  searchContext,
  variables,
  handleEvent,
  interactive,
  searchSessionId,
  onData$,
  onRender$,
  renderMode,
  syncColors,
  syncTooltips,
  syncCursor,
  hasCompatibleActions,
  getCompatibleCellValueActions,
  style,
  className,
  onRuntimeError,
  addUserMessages,
  executionContext,
  lensInspector,
  noPadding,
  abortController,
}: ExpressionWrapperProps) {
  if (!expression) return null;
  return (
    <I18nProvider>
      <div className={classNames('lnsExpressionRenderer', className)} style={style}>
        <ExpressionRendererComponent
          className="lnsExpressionRenderer__component"
          padding={noPadding ? undefined : 's'}
          variables={variables}
          expression={expression}
          interactive={interactive}
          searchContext={searchContext}
          searchSessionId={searchSessionId}
          // @ts-expect-error upgrade typescript v4.9.5
          onData$={onData$}
          onRender$={onRender$}
          inspectorAdapters={lensInspector.adapters}
          renderMode={renderMode}
          syncColors={syncColors}
          syncTooltips={syncTooltips}
          syncCursor={syncCursor}
          executionContext={executionContext}
          abortController={abortController}
          renderError={(errorMessage, error) => {
            const messages = getOriginalRequestErrorMessages(error || null);
            addUserMessages(messages);
            if (error?.original) {
              onRuntimeError(error.original);
            } else {
              onRuntimeError(new Error(errorMessage ? errorMessage : ''));
            }

            return <></>; // the embeddable will take care of displaying the messages
          }}
          onEvent={handleEvent}
          hasCompatibleActions={hasCompatibleActions}
          getCompatibleCellValueActions={getCompatibleCellValueActions}
        />
      </div>
    </I18nProvider>
  );
}
