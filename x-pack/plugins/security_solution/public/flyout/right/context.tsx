/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { css } from '@emotion/react';
import React, { createContext, useContext, useMemo } from 'react';
import type { SearchHit } from '@kbn/es-types';
import { EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { useTimelineEventsDetails } from '../../timelines/containers/details';
import { getAlertIndexAlias } from '../../timelines/components/side_panel/event_details/helpers';
import { useSpaceId } from '../../common/hooks/use_space_id';
import { useRouteSpy } from '../../common/utils/route/use_route_spy';
import { SecurityPageName } from '../../../common/constants';
import { SourcererScopeName } from '../../common/store/sourcerer/model';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import type { RightPanelProps } from '.';

export interface RightPanelContext {
  /**
   * Id of the document
   */
  eventId: string;
  /**
   * Name of the index used in the parent's page
   */
  indexName: string;
  /**
   * An object containing fields by type
   */
  browserFields: BrowserFields | null;
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] | null;
  /**
   * The actual raw document object
   */
  searchHit: SearchHit<object> | undefined;
}

export const RightPanelContext = createContext<RightPanelContext | undefined>(undefined);

export type RightPanelProviderProps = {
  /**
   * React components to render
   */
  children: React.ReactNode;
} & Partial<RightPanelProps['params']>;

export const RightPanelProvider = ({ id, indexName, children }: RightPanelProviderProps) => {
  const currentSpaceId = useSpaceId();
  const eventIndex = indexName ? getAlertIndexAlias(indexName, currentSpaceId) ?? indexName : '';
  const [{ pageName }] = useRouteSpy();
  const sourcererScope =
    pageName === SecurityPageName.detections
      ? SourcererScopeName.detections
      : SourcererScopeName.default;
  const sourcererDataView = useSourcererDataView(sourcererScope);
  const [loading, dataFormattedForFieldBrowser, searchHit] = useTimelineEventsDetails({
    indexName: eventIndex,
    eventId: id ?? '',
    runtimeMappings: sourcererDataView.runtimeMappings,
    skip: !id,
  });

  const contextValue = useMemo(
    () =>
      id && indexName
        ? {
            eventId: id,
            indexName,
            browserFields: sourcererDataView.browserFields,
            dataFormattedForFieldBrowser,
            searchHit: searchHit as SearchHit<object>,
          }
        : undefined,
    [id, indexName, sourcererDataView.browserFields, dataFormattedForFieldBrowser, searchHit]
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

  return <RightPanelContext.Provider value={contextValue}>{children}</RightPanelContext.Provider>;
};

export const useRightPanelContext = (): RightPanelContext => {
  const contextValue = useContext(RightPanelContext);

  if (!contextValue) {
    throw new Error('RightPanelContext can only be used within RightPanelContext provider');
  }

  return contextValue;
};
