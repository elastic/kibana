/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { css } from '@emotion/react';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import type { Ecs } from '@kbn/cases-plugin/common';
import type { SearchHit } from '../../../common/search_strategy';
import type { LeftPanelProps } from '.';
import { useGetFieldsData } from '../../common/hooks/use_get_fields_data';
import { useTimelineEventsDetails } from '../../timelines/containers/details';
import { getAlertIndexAlias } from '../../timelines/components/side_panel/event_details/helpers';
import { useSpaceId } from '../../common/hooks/use_space_id';
import { useRouteSpy } from '../../common/utils/route/use_route_spy';
import { SecurityPageName } from '../../../common/constants';
import { SourcererScopeName } from '../../common/store/sourcerer/model';
import { useSourcererDataView } from '../../common/containers/sourcerer';

export interface LeftPanelContext {
  /**
   * Id of the document
   */
  eventId: string;
  /**
   * Name of the index used in the parent's page
   */
  indexName: string;
  /**
   * Retrieves searchHit values for the provided field
   */
  getFieldsData: (field: string) => unknown | unknown[];
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] | null;

  data: SearchHit | undefined;

  dataAsNestedObject: Ecs | null;
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
  const [loading, dataFormattedForFieldBrowser, searchHit, dataAsNestedObject] =
    useTimelineEventsDetails({
      indexName: eventIndex,
      eventId: id ?? '',
      runtimeMappings: sourcererDataView.runtimeMappings,
      skip: !id,
    });
  const getFieldsData = useGetFieldsData(searchHit?.fields);

  const contextValue = useMemo(
    () =>
      id && indexName
        ? {
            eventId: id,
            indexName,
            getFieldsData,
            data: searchHit,
            dataFormattedForFieldBrowser,
            dataAsNestedObject,
          }
        : undefined,
    [id, indexName, getFieldsData, searchHit, dataFormattedForFieldBrowser, dataAsNestedObject]
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

  return <LeftFlyoutContext.Provider value={contextValue}>{children}</LeftFlyoutContext.Provider>;
};

export const useLeftPanelContext = () => {
  const contextValue = useContext(LeftFlyoutContext);

  if (!contextValue) {
    throw new Error('LeftPanelContext can only be used within LeftPanelContext provider');
  }

  return contextValue;
};
