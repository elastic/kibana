/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiIconTip, EuiFlexItem } from '@elastic/eui';
import type { RenderContentPanelProps } from '@kbn/triggers-actions-ui-plugin/public/types';
import React, { useCallback, useMemo } from 'react';
import { BulkAlertAssigneesPanel } from './alert_bulk_assignees';
import * as i18n from './translations';
import { useSetAlertAssignees } from './use_set_alert_assignees';

export interface UseBulkAlertAssigneesItemsProps {
  refetch?: () => void;
}

export interface UseBulkAlertAssigneesPanel {
  id: number;
  title: JSX.Element;
  'data-test-subj': string;
  renderContent: (props: RenderContentPanelProps) => JSX.Element;
}

export const useBulkAlertAssigneesItems = ({ refetch }: UseBulkAlertAssigneesItemsProps) => {
  const setAlertAssignees = useSetAlertAssignees();
  const handleOnAlertAssigneesSubmit = useCallback(
    async (assignees, ids, onSuccess, setIsLoading) => {
      if (setAlertAssignees) {
        await setAlertAssignees(assignees, ids, onSuccess, setIsLoading);
      }
    },
    [setAlertAssignees]
  );

  const alertAssigneesItems = [
    {
      key: 'manage-alert-assignees',
      'data-test-subj': 'alert-assignees-context-menu-item',
      name: i18n.ALERT_ASSIGNEES_CONTEXT_MENU_ITEM_TITLE,
      panel: 2,
      label: i18n.ALERT_ASSIGNEES_CONTEXT_MENU_ITEM_TITLE,
      disableOnQuery: true,
    },
  ];

  const TitleContent = useMemo(
    () => (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>{i18n.ALERT_ASSIGNEES_CONTEXT_MENU_ITEM_TITLE}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip
            content={i18n.ALERT_ASSIGNEES_CONTEXT_MENU_ITEM_TOOLTIP_INFO}
            position="right"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  const renderContent = useCallback(
    ({
      alertItems,
      refresh,
      setIsBulkActionsLoading,
      clearSelection,
      closePopoverMenu,
    }: RenderContentPanelProps) => (
      <BulkAlertAssigneesPanel
        alertItems={alertItems}
        refresh={refresh}
        refetchQuery={refetch}
        setIsLoading={setIsBulkActionsLoading}
        clearSelection={clearSelection}
        closePopoverMenu={closePopoverMenu}
        onSubmit={handleOnAlertAssigneesSubmit}
      />
    ),
    [handleOnAlertAssigneesSubmit, refetch]
  );

  const alertAssigneesPanels: UseBulkAlertAssigneesPanel[] = useMemo(
    () => [
      {
        id: 2,
        title: TitleContent,
        'data-test-subj': 'alert-assignees-context-menu-panel',
        renderContent,
      },
    ],
    [TitleContent, renderContent]
  );

  return {
    alertAssigneesItems,
    alertAssigneesPanels,
  };
};
