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

import { useEventDetails } from '../shared/hooks/use_event_details';
import { FlyoutError } from '../../shared/components/flyout_error';
import { FlyoutLoading } from '../../shared/components/flyout_loading';
import type { SearchHit } from '../../../../common/search_strategy';
import { useBasicDataFromDetailsData } from '../../../timelines/components/side_panel/event_details/helpers';
import type { DocumentPreviewPanelProps } from '.';
import type { GetFieldsData } from '../../../common/hooks/use_get_fields_data';
import { useRuleWithFallback } from '../../../detection_engine/rule_management/logic/use_rule_with_fallback';

export interface DocumentPreviewPanelContext {
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
   * Title of flyout (Rule name for alerts)
   */
  title: string;
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
   * Boolean to indicate whether it is a preview flyout
   */
  isPreview: boolean;
}

export const DocumentPreviewPanelContext = createContext<DocumentPreviewPanelContext | undefined>(
  undefined
);

export type DocumentPreviewPanelProviderProps = {
  /**
   * React components to render
   */
  children: React.ReactNode;
} & Partial<DocumentPreviewPanelProps['params']>;

export const DocumentPreviewPanelProvider = memo(
  ({ id, indexName, scopeId, children }: DocumentPreviewPanelProviderProps) => {
    const {
      browserFields,
      dataAsNestedObject,
      dataFormattedForFieldBrowser,
      getFieldsData,
      loading,
      refetchFlyoutData,
      searchHit,
    } = useEventDetails({ eventId: id, indexName });

    const { ruleId, ruleName } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);
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
              title: ruleName,
              browserFields,
              dataAsNestedObject,
              dataFormattedForFieldBrowser,
              searchHit,
              investigationFields: maybeRule?.investigation_fields?.field_names ?? [],
              refetchFlyoutData,
              getFieldsData,
              isPreview: scopeId === TableId.rulePreview,
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
        ruleName,
      ]
    );

    if (loading) {
      return <FlyoutLoading />;
    }

    if (!contextValue) {
      return <FlyoutError />;
    }

    return (
      <DocumentPreviewPanelContext.Provider value={contextValue}>
        {children}
      </DocumentPreviewPanelContext.Provider>
    );
  }
);

DocumentPreviewPanelProvider.displayName = 'DocumentPreviewPanelProvider';

export const useDocumentPreviewPanelContext = (): DocumentPreviewPanelContext => {
  const contextValue = useContext(DocumentPreviewPanelContext);

  if (!contextValue) {
    throw new Error(
      'Document preview panel context can only be used within Document Preview Panel context provider'
    );
  }

  return contextValue;
};
