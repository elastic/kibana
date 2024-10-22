/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import React, { useEffect, useRef } from 'react';
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
    // has view mode changed?
    latestViewMode,
  ] = useBatchedPublishingSubjects(internalApi.expressionParams$, api.viewMode);
  const canEdit = Boolean(api.isEditingEnabled?.() && getViewMode(latestViewMode) === 'edit');
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [warningOrErrors, infoMessages] = useMessages(internalApi);

  // On unmount call all the cleanups
  useEffect(() => {
    if (rootRef.current) {
      internalApi.registerNode(rootRef.current);
    }
    return onUnmount;
  }, [internalApi, onUnmount]);

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
      {...title}
      {...description}
      data-shared-item
      ref={rootRef}
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
