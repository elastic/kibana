/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderContentPanelProps } from '@kbn/triggers-actions-ui-plugin/public/types';
import React from 'react';
import { BulkAlertTagsPanelComponent } from './alert_bulk_tags';

interface UseBulkAlertTagsItemsProps {
  refetch: () => void;
}

export const useBulkAlertTagsItems = ({ refetch }: UseBulkAlertTagsItemsProps) => {
  const alertTagsItems = [
    {
      key: 'sample key',
      'data-test-subj': 'alert-tags-context-menu-item',
      name: 'Add tags',
      panel: 1,
      label: 'Add tags',
      disableOnQuery: true,
    },
  ];

  const alertTagsPanels = [
    {
      id: 1,
      title: 'Add tags',
      renderContent: ({
        selectedIds,
        refresh,
        setIsBulkActionsLoading,
        clearSelection,
        closePopoverMenu,
      }: RenderContentPanelProps) => (
        <BulkAlertTagsPanelComponent
          alertIds={selectedIds}
          refresh={refresh}
          refetchQuery={refetch}
          setIsLoading={setIsBulkActionsLoading}
          clearSelection={clearSelection}
          closePopoverMenu={closePopoverMenu}
        />
      ),
    },
  ];

  return {
    alertTagsItems,
    alertTagsPanels,
  };
};
