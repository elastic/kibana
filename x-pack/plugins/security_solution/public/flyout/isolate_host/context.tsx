/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { css } from '@emotion/react';
import React, { createContext, useContext, useMemo } from 'react';
import { EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';

import { useTimelineEventsDetails } from '../../timelines/containers/details';
import { getAlertIndexAlias } from '../../timelines/components/side_panel/event_details/helpers';
import { useSpaceId } from '../../common/hooks/use_space_id';
import { useRouteSpy } from '../../common/utils/route/use_route_spy';
import { SecurityPageName } from '../../../common/constants';
import { SourcererScopeName } from '../../common/store/sourcerer/model';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import type { IsolateHostPanelProps } from '.';

export interface IsolateHostPanelContext {
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
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] | null;
}

export const IsolateHostPanelContext = createContext<IsolateHostPanelContext | undefined>(
  undefined
);

export type IsolateHostPanelProviderProps = {
  /**
   * React components to render
   */
  children: React.ReactNode;
} & Partial<IsolateHostPanelProps['params']>;

export const IsolateHostPanelProvider = ({
  id,
  indexName,
  scopeId,
  children,
}: IsolateHostPanelProviderProps) => {
  const currentSpaceId = useSpaceId();
  // TODO Replace getAlertIndexAlias way to retrieving the eventIndex with the GET /_alias
  //  https://github.com/elastic/kibana/issues/113063
  const eventIndex = indexName ? getAlertIndexAlias(indexName, currentSpaceId) ?? indexName : '';
  const [{ pageName }] = useRouteSpy();
  const sourcererScope =
    pageName === SecurityPageName.detections
      ? SourcererScopeName.detections
      : SourcererScopeName.default;
  const sourcererDataView = useSourcererDataView(sourcererScope);
  const [loading, dataFormattedForFieldBrowser] = useTimelineEventsDetails({
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
            dataFormattedForFieldBrowser,
          }
        : undefined,
    [id, indexName, scopeId, dataFormattedForFieldBrowser]
  );

  if (loading) {
    return (
      <EuiFlexItem
        css={css`
          align-items: center;
          justify-content: center;
        `}
      >
        <EuiLoadingSpinner size="xxl" />
      </EuiFlexItem>
    );
  }

  return (
    <IsolateHostPanelContext.Provider value={contextValue}>
      {children}
    </IsolateHostPanelContext.Provider>
  );
};

export const useIsolateHostPanelContext = (): IsolateHostPanelContext => {
  const contextValue = useContext(IsolateHostPanelContext);

  if (!contextValue) {
    throw new Error(
      'IsolateHostPanelContext can only be used within IsolateHostPanelContext provider'
    );
  }

  return contextValue;
};
