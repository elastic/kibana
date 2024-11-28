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
import { useMessages, useDispatcher } from './hooks';
import { getViewMode } from '../helper';
import { addLog } from '../logger';

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
    // these are blocking errors that can be shown in a badge
    // without replacing the entire panel
    blockingErrors,
    // has view mode changed?
    latestViewMode,
  ] = useBatchedPublishingSubjects(
    internalApi.expressionParams$,
    internalApi.renderCount$,
    internalApi.hasRenderCompleted$,
    internalApi.validationMessages$,
    api.viewMode
  );
  const canEdit = Boolean(api.isEditingEnabled?.() && getViewMode(latestViewMode) === 'edit');

  const [warningOrErrors, infoMessages] = useMessages(internalApi);

  // On unmount call all the cleanups
  useEffect(() => {
    addLog(`Mounting Lens Embeddable component: ${api.defaultPanelTitle?.getValue()}`);
    return onUnmount;
  }, [api, onUnmount]);

  // take care of dispatching the event from the DOM node
  const rootRef = useDispatcher(hasRendered, api);

  // Publish the data attributes only if avaialble/visible
  const title = internalApi.getDisplayOptions()?.noPanelTitle
    ? undefined
    : { 'data-title': api.panelTitle?.getValue() ?? api.defaultPanelTitle?.getValue() };
  const description = api.panelDescription?.getValue()
    ? {
        'data-description':
          api.panelDescription?.getValue() ?? api.defaultPanelDescription?.getValue(),
      }
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
      {expressionParams == null || blockingErrors.length ? null : (
        <ExpressionWrapper {...expressionParams} />
      )}
      <UserMessages
        blockingErrors={blockingErrors}
        warningOrErrors={warningOrErrors}
        infoMessages={infoMessages}
        canEdit={canEdit}
      />
    </div>
  );
}
