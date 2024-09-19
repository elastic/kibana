/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import React, { createContext, memo, useContext, useMemo } from 'react';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { TableId } from '@kbn/securitysolution-data-table';
import { FlyoutError, FlyoutLoading } from '@kbn/security-solution-common/src/flyout';
import { useEventDetails } from './hooks/use_event_details';
import type { SearchHit } from '../../../../common/search_strategy';
import { useBasicDataFromDetailsData } from './hooks/use_basic_data_from_details_data';
import type { DocumentDetailsProps } from './types';
import type { GetFieldsData } from './hooks/use_get_fields_data';
import { useRuleWithFallback } from '../../../detection_engine/rule_management/logic/use_rule_with_fallback';

export interface DocumentDetailsContext {
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
  /**
   * Boolean to indicate whether flyout is opened in rule preview
   */
  isPreview: boolean;
  /**
   * Boolean to indicate whether it is a preview panel
   */
  isPreviewMode: boolean;
}

/**
 * A context provider shared by the right, left and preview panels in expandable document details flyout
 */
export const DocumentDetailsContext = createContext<DocumentDetailsContext | undefined>(undefined);

export type DocumentDetailsProviderProps = {
  /**
   * React components to render
   */
  children: React.ReactNode;
} & Partial<DocumentDetailsProps['params']>;

export const DocumentDetailsProvider = memo(
  ({ id, indexName, scopeId, isPreviewMode, children }: DocumentDetailsProviderProps) => {
    const {
      browserFields,
      dataAsNestedObject,
      dataFormattedForFieldBrowser,
      getFieldsData,
      loading,
      refetchFlyoutData,
      searchHit,
    } = useEventDetails({ eventId: id, indexName });

    const { ruleId } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);
    const { rule: maybeRule } = useRuleWithFallback(ruleId);

    const contextValue = useMemo(
      () =>
        id &&
        indexName &&
        scopeId &&
        dataAsNestedObject &&
        dataFormattedForFieldBrowser &&
        searchHit
          ? {
              eventId: id,
              indexName,
              scopeId,
              browserFields,
              dataAsNestedObject,
              dataFormattedForFieldBrowser,
              searchHit,
              investigationFields: maybeRule?.investigation_fields?.field_names ?? [],
              refetchFlyoutData,
              getFieldsData,
              isPreview: scopeId === TableId.rulePreview,
              isPreviewMode: Boolean(isPreviewMode),
            }
          : undefined,
      [
        id,
        maybeRule,
        indexName,
        scopeId,
        browserFields,
        dataAsNestedObject,
        dataFormattedForFieldBrowser,
        searchHit,
        refetchFlyoutData,
        getFieldsData,
        isPreviewMode,
      ]
    );

    if (loading) {
      return <FlyoutLoading />;
    }

    if (!contextValue) {
      return <FlyoutError />;
    }

    return (
      <DocumentDetailsContext.Provider value={contextValue}>
        {children}
      </DocumentDetailsContext.Provider>
    );
  }
);

DocumentDetailsProvider.displayName = 'DocumentDetailsProvider';

export const useDocumentDetailsContext = (): DocumentDetailsContext => {
  const contextValue = useContext(DocumentDetailsContext);

  if (!contextValue) {
    throw new Error(
      'DocumentDetailsContext can only be used within DocumentDetailsContext provider'
    );
  }

  return contextValue;
};
