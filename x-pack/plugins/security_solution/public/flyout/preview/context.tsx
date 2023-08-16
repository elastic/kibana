/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { DataViewBase } from '@kbn/es-query';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import type { PreviewPanelProps } from '.';
import { SourcererScopeName } from '../../common/store/sourcerer/model';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import { useTimelineEventsDetails } from '../../timelines/containers/details';
import { getAlertIndexAlias } from '../../timelines/components/side_panel/event_details/helpers';
import { useSpaceId } from '../../common/hooks/use_space_id';
import { useRouteSpy } from '../../common/utils/route/use_route_spy';

export interface PreviewPanelContext {
  /**
   * Id of the document
   */
  eventId: string;
  /**
   * Name of the index used in the parent's page
   */
  indexName: string;
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
  /**
   * Rule id if preview is rule details
   */
  ruleId: string;
  /**
   * Index pattern for rule details
   */
  indexPattern: DataViewBase;
  /**
   * An object with top level fields from the ECS object
   */
  dataAsNestedObject: Ecs | null;
}

export const PreviewPanelContext = createContext<PreviewPanelContext | undefined>(undefined);

export type PreviewPanelProviderProps = {
  /**
   * React components to render
   */
  children: React.ReactNode;
} & Partial<PreviewPanelProps['params']>;

export const PreviewPanelProvider = ({
  id,
  indexName,
  scopeId,
  ruleId,
  children,
}: PreviewPanelProviderProps) => {
  const currentSpaceId = useSpaceId();
  const eventIndex = indexName ? getAlertIndexAlias(indexName, currentSpaceId) ?? indexName : '';
  const [{ pageName }] = useRouteSpy();
  const sourcererScope =
    pageName === SecurityPageName.detections
      ? SourcererScopeName.detections
      : SourcererScopeName.default;
  const sourcererDataView = useSourcererDataView(sourcererScope);
  const [_, __, ___, dataAsNestedObject] = useTimelineEventsDetails({
    indexName: eventIndex,
    eventId: id ?? '',
    runtimeMappings: sourcererDataView.runtimeMappings,
    skip: !id,
  });

  const contextValue = useMemo(
    () =>
      id && indexName && scopeId
        ? {
            eventId: id,
            indexName,
            scopeId,
            ruleId: ruleId ?? '',
            indexPattern: sourcererDataView.indexPattern,
            dataAsNestedObject,
          }
        : undefined,
    [id, indexName, scopeId, ruleId, sourcererDataView.indexPattern, dataAsNestedObject]
  );

  return (
    <PreviewPanelContext.Provider value={contextValue}>{children}</PreviewPanelContext.Provider>
  );
};

export const usePreviewPanelContext = (): PreviewPanelContext => {
  const contextValue = useContext(PreviewPanelContext);

  if (!contextValue) {
    throw new Error('PreviewPanelContext can only be used within PreviewPanelContext provider');
  }

  return contextValue;
};
