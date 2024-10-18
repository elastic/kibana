/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import React, { useEffect } from 'react';
import { LensApi } from '../..';
import { ExpressionWrapper } from '../expression_wrapper';
import { LensInternalApi } from '../types';
import { UserMessages } from '../user_messages/container';
import { useMessages } from '../user_messages/use_messages';

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
  ] = useBatchedPublishingSubjects(
    internalApi.expressionParams$,
    internalApi.renderCount$,
    internalApi.hasRenderCompleted$
  );
  const canEdit = Boolean(api.isEditingEnabled?.() && api.viewMode.getValue() === 'edit');

  const [warningOrErrors, infoMessages] = useMessages(internalApi);

  // On unmount call all the cleanups
  useEffect(() => {
    return onUnmount;
  }, [onUnmount]);

  // Publish the data attributes only if avaialble/visible
  const title = !api.hidePanelTitle?.getValue()
    ? { 'data-title': api.panelTitle?.getValue() }
    : undefined;
  const description = api.panelDescription?.getValue()
    ? { 'data-description': api.panelDescription?.getValue() }
    : undefined;

  return (
    <div
      style={{ width: '100%', height: '100%' }}
      data-rendering-count={renderCount}
      data-render-complete={hasRendered}
      {...title}
      {...description}
      data-shared-item
    >
      {expressionParams == null ? null : <ExpressionWrapper {...expressionParams} />}
      <UserMessages
        warningOrErrors={warningOrErrors}
        infoMessages={infoMessages}
        canEdit={canEdit}
      />
    </div>
  );
}
