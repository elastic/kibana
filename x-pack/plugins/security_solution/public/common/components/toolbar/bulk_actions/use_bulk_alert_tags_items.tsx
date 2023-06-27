/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderContentPanelProps } from '@kbn/triggers-actions-ui-plugin/public/types';
import React, { useCallback } from 'react';
import { BulkAlertTagsPanel } from './alert_bulk_tags';
import * as i18n from './translations';
import { useSetAlertTags } from './use_set_alert_tags';

interface UseBulkAlertTagsItemsProps {
  refetch?: () => void;
}

export const useBulkAlertTagsItems = ({ refetch }: UseBulkAlertTagsItemsProps) => {
  const setAlertTags = useSetAlertTags();
  const handleOnAlertTagsSubmit = useCallback(
    async (tags, ids, onSuccess, setIsLoading) => {
      if (setAlertTags) {
        await setAlertTags(tags, ids, onSuccess, setIsLoading);
      }
    },
    [setAlertTags]
  );

  const alertTagsItems = [
    {
      key: 'manage-alert-tags',
      'data-test-subj': 'alert-tags-context-menu-item',
      name: i18n.ALERT_TAGS_CONTEXT_MENU_ITEM_TITLE,
      panel: 1,
      label: i18n.ALERT_TAGS_CONTEXT_MENU_ITEM_TITLE,
      disableOnQuery: true,
    },
  ];

  const alertTagsPanels = [
    {
      id: 1,
      title: i18n.ALERT_TAGS_CONTEXT_MENU_ITEM_TITLE,
      renderContent: ({
        alertItems,
        refresh,
        setIsBulkActionsLoading,
        clearSelection,
        closePopoverMenu,
      }: RenderContentPanelProps) => (
        <BulkAlertTagsPanel
          alertItems={alertItems}
          refresh={refresh}
          refetchQuery={refetch}
          setIsLoading={setIsBulkActionsLoading}
          clearSelection={clearSelection}
          closePopoverMenu={closePopoverMenu}
          onSubmit={handleOnAlertTagsSubmit}
        />
      ),
    },
  ];

  return {
    alertTagsItems,
    alertTagsPanels,
  };
};
