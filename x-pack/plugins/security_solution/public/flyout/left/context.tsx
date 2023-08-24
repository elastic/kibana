/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { css } from '@emotion/react';
import React, { createContext, useContext, useMemo } from 'react';
import { EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { SearchHit } from '../../../common/search_strategy';
import type { LeftPanelProps } from '.';
import type { GetFieldsData } from '../../common/hooks/use_get_fields_data';
import { useGetFieldsData } from '../../common/hooks/use_get_fields_data';
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
import { useRuleWithFallback } from '../../detection_engine/rule_management/logic/use_rule_with_fallback';

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
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
  /**
   * An object containing fields by type
   */
  browserFields: BrowserFields | null;
  /**
   * An object with top level fields from the ECS object
   */
  dataAsNestedObject: Ecs | null;
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] | null;
  /**
   * The actual raw document object
   */
  searchHit: SearchHit | undefined;
  /**
   * User defined fields to highlight (defined on the rule)
   */
  investigationFields: string[];
  /**
   * Retrieves searchHit values for the provided field
   */
  getFieldsData: GetFieldsData;
}

export const LeftPanelContext = createContext<LeftPanelContext | undefined>(undefined);

export type LeftPanelProviderProps = {
  /**
   * React components to render
   */
  children: React.ReactNode;
} & Partial<LeftPanelProps['params']>;

export const LeftPanelProvider = ({ id, indexName, scopeId, children }: LeftPanelProviderProps) => {
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
  const { ruleId } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);
  const { rule: maybeRule } = useRuleWithFallback(ruleId);

  const contextValue = useMemo(
    () =>
      id && indexName && scopeId
        ? {
            eventId: id,
            indexName,
            scopeId,
            browserFields: sourcererDataView.browserFields,
            dataAsNestedObject,
            dataFormattedForFieldBrowser,
            searchHit,
            investigationFields: maybeRule?.investigation_fields ?? [],
            getFieldsData,
          }
        : undefined,
    [
      id,
      indexName,
      scopeId,
      sourcererDataView.browserFields,
      dataAsNestedObject,
      dataFormattedForFieldBrowser,
      searchHit,
      maybeRule?.investigation_fields,
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

  return <LeftPanelContext.Provider value={contextValue}>{children}</LeftPanelContext.Provider>;
};

export const useLeftPanelContext = () => {
  const contextValue = useContext(LeftPanelContext);

  if (!contextValue) {
    throw new Error('LeftPanelContext can only be used within LeftPanelContext provider');
  }

  return contextValue;
};
