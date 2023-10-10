/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import React, { createContext, memo, useContext, useMemo, useState } from 'react';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';

import type { DataTableRecord } from '@kbn/discover-utils/types';
import { useEventDetails } from '../shared/hooks/use_event_details';
import { FlyoutError } from '../shared/components/flyout_error';
import { FlyoutLoading } from '../shared/components/flyout_loading';
import type { SearchHit } from '../../../common/search_strategy';
import { useBasicDataFromDetailsData } from '../../timelines/components/side_panel/event_details/helpers';
import type { RightPanelProps } from '.';
import type { GetFieldsData } from '../../common/hooks/use_get_fields_data';
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
  rowIndex: number;
  setRowIndex: (rowIndex: number) => void;
  docs: DataTableRecord[];
  setExpandedDoc: (doc: DataTableRecord | undefined) => void;
}

export const RightPanelContext = createContext<RightPanelContext | undefined>(undefined);

export type RightPanelProviderProps = {
  /**
   * React components to render
   */
  children: React.ReactNode;
} & Partial<RightPanelProps['params']>;

export const RightPanelProvider = memo(
  ({
    id,
    indexName,
    scopeId,
    rowIndex,
    docs,
    setExpandedDoc,
    children,
  }: RightPanelProviderProps) => {
    const [displayedRowIndex, setDisplayedRowIndex] = useState(rowIndex ?? -1);
    const displayedId = docs ? docs[displayedRowIndex]?.id : id;
    const displayedIndexName = docs ? docs[displayedRowIndex]?.raw._index : indexName;

    const {
      browserFields,
      dataAsNestedObject,
      dataFormattedForFieldBrowser,
      getFieldsData,
      loading,
      refetchFlyoutData,
      searchHit,
    } = useEventDetails({ eventId: displayedId, indexName: displayedIndexName ?? undefined });

    const { ruleId } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);
    const { rule: maybeRule } = useRuleWithFallback(ruleId);

    const contextValue = useMemo(
      () =>
        displayedId &&
        displayedIndexName &&
        scopeId &&
        dataAsNestedObject &&
        dataFormattedForFieldBrowser &&
        searchHit &&
        docs &&
        setExpandedDoc
          ? {
              eventId: displayedId,
              indexName: displayedIndexName,
              scopeId,
              browserFields,
              dataAsNestedObject,
              dataFormattedForFieldBrowser,
              searchHit,
              investigationFields: maybeRule?.investigation_fields?.field_names ?? [],
              refetchFlyoutData,
              getFieldsData,
              rowIndex: displayedRowIndex,
              setRowIndex: setDisplayedRowIndex,
              docs,
              setExpandedDoc,
            }
          : undefined,
      [
        displayedId,
        maybeRule,
        displayedIndexName,
        scopeId,
        browserFields,
        dataAsNestedObject,
        dataFormattedForFieldBrowser,
        searchHit,
        refetchFlyoutData,
        getFieldsData,
        displayedRowIndex,
        setDisplayedRowIndex,
        setExpandedDoc,
        docs,
      ]
    );

    if (loading) {
      return <FlyoutLoading />;
    }

    if (!contextValue) {
      return <FlyoutError />;
    }

    return <RightPanelContext.Provider value={contextValue}>{children}</RightPanelContext.Provider>;
  }
);

RightPanelProvider.displayName = 'RightPanelProvider';

export const useRightPanelContext = (): RightPanelContext => {
  const contextValue = useContext(RightPanelContext);

  if (!contextValue) {
    throw new Error('RightPanelContext can only be used within RightPanelContext provider');
  }

  return contextValue;
};
