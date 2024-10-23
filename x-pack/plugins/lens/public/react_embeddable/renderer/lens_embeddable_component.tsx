/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import React, { useEffect, useRef } from 'react';
import { dispatchRenderComplete, dispatchRenderStart } from '@kbn/kibana-utils-plugin/public';
import { LensApi } from '../..';
import { ExpressionWrapper } from '../expression_wrapper';
import { LensInternalApi } from '../types';
import { UserMessages } from '../user_messages/container';
import { useMessages } from '../user_messages/use_messages';
import { getViewMode } from '../helper';

export function LensEmbeddableComponent({
  internalApi,
  api,
  onUnmount,
}: {
  internalApi: LensInternalApi;
  api: LensApi;
  onUnmount: () => void;
}) {
  const [
    // Pick up updated params from the observable
    expressionParams,
    // used for functional tests
    renderCount,
    // has the render completed?
    hasRendered,
    // has view mode changed?
    latestViewMode,
  ] = useBatchedPublishingSubjects(
    internalApi.expressionParams$,
    internalApi.renderCount$,
    internalApi.hasRenderCompleted$,
    api.viewMode
  );
  const canEdit = Boolean(api.isEditingEnabled?.() && getViewMode(latestViewMode) === 'edit');
  const rootRef = useRef<HTMLDivElement | null>(null);

  const { error = [], warning = [], info = [] } = useMessages(internalApi);

  // On unmount call all the cleanups
  useEffect(() => {
    return onUnmount;
  }, [onUnmount]);

  // take care of dispatching the event from the DOM node
  useEffect(() => {
    if (!rootRef.current || api.blockingError?.getValue()) {
      return;
    }
    if (hasRendered) {
      dispatchRenderComplete(rootRef.current);
    } else {
      dispatchRenderStart(rootRef.current);
    }
  }, [renderCount, hasRendered, api.blockingError]);

  // Publish the data attributes only if avaialble/visible
  const title = api.hidePanelTitle?.getValue()
    ? undefined
    : { 'data-title': api.panelTitle?.getValue() };
  const description = api.panelDescription?.getValue()
    ? { 'data-description': api.panelDescription?.getValue() }
    : undefined;

  return (
    <div
      style={{ width: '100%', height: '100%' }}
      data-rendering-count={renderCount + 1}
      data-render-complete={hasRendered}
      {...title}
      {...description}
      data-shared-item
      ref={rootRef}
    >
      {expressionParams == null || error.length ? null : (
        <ExpressionWrapper {...expressionParams} />
      )}
      <UserMessages
        blockingErrors={error}
        warningOrErrors={warning}
        infoMessages={info}
        canEdit={canEdit}
      />
    </div>
  );
}
