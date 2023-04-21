/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { LeftPanelProps } from '.';
import { SecurityPageName } from '../../../common/constants';
import { SourcererScopeName } from '../../common/store/sourcerer/model';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import { useTimelineEventsDetails } from '../../timelines/containers/details';
import { useRouteSpy } from '../../common/utils/route/use_route_spy';
import { useSpaceId } from '../../common/hooks/use_space_id';
import { getAlertIndexAlias } from '../../timelines/components/side_panel/event_details/helpers';
import type { RawEventData } from '../../common/components/event_details/types';

export interface LeftPanelContext {
  /**
   * Id of the document
   */
  eventId: string;
  /**
   * Name of the index used in the parent's page
   */
  indexName: string;

  // TODO verify the type in comparison to SearchHit
  rawEventData: RawEventData;
}

export const LeftFlyoutContext = createContext<LeftPanelContext | undefined>(undefined);

export type LeftPanelProviderProps = {
  /**
   * React components to render
   */
  children: React.ReactNode;
} & Partial<LeftPanelProps['params']>;

export const LeftPanelProvider = ({ id, indexName, children }: LeftPanelProviderProps) => {
  const currentSpaceId = useSpaceId();
  const eventIndex = indexName ? getAlertIndexAlias(indexName, currentSpaceId) ?? indexName : '';
  const [{ pageName }] = useRouteSpy();
  const sourcererScope =
    pageName === SecurityPageName.detections
      ? SourcererScopeName.detections
      : SourcererScopeName.default;
  const sourcererDataView = useSourcererDataView(sourcererScope);
  const [, _, rawEventData] = useTimelineEventsDetails({
    entityType: 'events',
    indexName: eventIndex,
    eventId: id ?? '',
    runtimeMappings: sourcererDataView.runtimeMappings,
    skip: !id,
  });

  const contextValue = useMemo(
    () => (id && indexName ? { eventId: id, indexName, rawEventData } : undefined),
    [rawEventData, id, indexName]
  );

  // @ts-expect-error compare to SearchHit
  return <LeftFlyoutContext.Provider value={contextValue}>{children}</LeftFlyoutContext.Provider>;
};

export const useLeftPanelContext = () => {
  const contextValue = useContext(LeftFlyoutContext);

  if (!contextValue) {
    throw new Error('LeftPanelContext can only be used within LeftPanelContext provider');
  }

  return contextValue;
};
