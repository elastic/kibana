/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { css } from '@emotion/react';
import React, { createContext, useContext, useMemo } from 'react';
import { EuiEmptyPrompt, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';

import { FLYOUT_ERROR_TEST_ID } from '../shared/test_ids';
import { ERROR_MESSAGE, ERROR_TITLE, FLYOUT_ERROR } from '../shared/translations';
import type { SearchHit } from '../../../common/search_strategy';
import { useTimelineEventsDetails } from '../../timelines/containers/details';
import {
  getAlertIndexAlias,
  useBasicDataFromDetailsData,
} from '../../timelines/components/side_panel/event_details/helpers';
import { useSpaceId } from '../../common/hooks/use_space_id';
import { useRouteSpy } from '../../common/utils/route/use_route_spy';
import { SecurityPageName } from '../../../common/constants';
import { SourcererScopeName } from '../../common/store/sourcerer/model';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import type { RightPanelProps } from '.';
import type { GetFieldsData } from '../../common/hooks/use_get_fields_data';
import { useGetFieldsData } from '../../common/hooks/use_get_fields_data';
import { useRuleWithFallback } from '../../detection_engine/rule_management/logic/use_rule_with_fallback';

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
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
  /**
   * An object containing fields by type
   */
  browserFields: BrowserFields;
  /**
   * An object with top level fields from the ECS object
   */
  dataAsNestedObject: Ecs;
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[];
  /**
   * The actual raw document object
   */
  searchHit: SearchHit;
  /**
   * User defined fields to highlight (defined on the rule)
   */
  investigationFields: string[];
  /**
   * Promise to trigger a data refresh
   */
  refetchFlyoutData: () => Promise<void>;
  /**
   * Retrieves searchHit values for the provided field
   */
  getFieldsData: GetFieldsData;
}

export const RightPanelContext = createContext<RightPanelContext | undefined>(undefined);

export type RightPanelProviderProps = {
  /**
   * React components to render
   */
  children: React.ReactNode;
} & Partial<RightPanelProps['params']>;

export const RightPanelProvider = ({
  id,
  indexName,
  scopeId,
  children,
}: RightPanelProviderProps) => {
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
      eventId: id ?? '',
      runtimeMappings: sourcererDataView.runtimeMappings,
      skip: !id,
    });
  const getFieldsData = useGetFieldsData(searchHit?.fields);
  const { ruleId } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);
  const { rule: maybeRule } = useRuleWithFallback(ruleId);

  const contextValue = useMemo(
    () =>
      id && indexName && scopeId && dataAsNestedObject && dataFormattedForFieldBrowser && searchHit
        ? {
            eventId: id,
            indexName,
            scopeId,
            browserFields: sourcererDataView.browserFields,
            dataAsNestedObject,
            dataFormattedForFieldBrowser,
            searchHit,
            investigationFields: maybeRule?.investigation_fields?.field_names ?? [],
            refetchFlyoutData,
            getFieldsData,
          }
        : undefined,
    [
      id,
      maybeRule,
      indexName,
      scopeId,
      sourcererDataView.browserFields,
      dataAsNestedObject,
      dataFormattedForFieldBrowser,
      searchHit,
      refetchFlyoutData,
      getFieldsData,
    ]
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

  if (!contextValue) {
    return (
      <EuiEmptyPrompt
        iconType="error"
        color="danger"
        title={<h2>{ERROR_TITLE(FLYOUT_ERROR)}</h2>}
        body={<p>{ERROR_MESSAGE(FLYOUT_ERROR)}</p>}
        data-test-subj={FLYOUT_ERROR_TEST_ID}
      />
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
