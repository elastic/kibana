/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import type { DataViewBase } from '@kbn/es-query';
import type { RunTimeMappings } from '../../../../../common/api/search_strategy';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { getAlertIndexAlias } from '../../../../timelines/components/side_panel/event_details/helpers';
import { useRouteSpy } from '../../../../common/utils/route/use_route_spy';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { useTimelineEventsDetails } from '../../../../timelines/containers/details';
import { useGetFieldsData } from '../../../../common/hooks/use_get_fields_data';
import type { SearchHit } from '../../../../../common/search_strategy';
import type { GetFieldsData } from '../../../../common/hooks/use_get_fields_data';

export interface UseEventDetailsParams {
  /**
   * Id of the document
   */
  eventId: string | undefined;
  /**
   * Name of the index used in the parent's page
   */
  indexName: string | undefined;
}

export interface UseEventDetailsResult {
  /**
   * An object containing fields by type
   */
  browserFields: BrowserFields;
  /**
   * An object with top level fields from the ECS object
   */
  dataAsNestedObject: Ecs | null;
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] | null;
  /**
   * Retrieves searchHit values for the provided field
   */
  getFieldsData: GetFieldsData;
  /**
   * Index pattern for rule details
   */
  indexPattern: DataViewBase;
  /**
   * Whether the data is loading
   */
  loading: boolean;
  /**
   * Promise to trigger a data refresh
   */
  refetchFlyoutData: () => Promise<void>;
  /**
   * The actual raw document object
   */
  searchHit: SearchHit | undefined;
}

/**
 * Hook to retrieve event details for alert details flyout contexts
 */
export const useEventDetails = ({
  eventId,
  indexName,
}: UseEventDetailsParams): UseEventDetailsResult => {
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
  const [loading, dataFormattedForFieldBrowser, searchHit, dataAsNestedObject, refetchFlyoutData] =
    useTimelineEventsDetails({
      indexName: eventIndex,
      eventId: eventId ?? '',
      runtimeMappings: sourcererDataView.runtimeMappings as RunTimeMappings,
      skip: !eventId,
    });
  const getFieldsData = useGetFieldsData(searchHit?.fields);

  return {
    browserFields: sourcererDataView.browserFields,
    dataAsNestedObject,
    dataFormattedForFieldBrowser,
    getFieldsData,
    indexPattern: sourcererDataView.indexPattern,
    loading,
    refetchFlyoutData,
    searchHit,
  };
};
