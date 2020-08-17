/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState } from 'react';

import { DataFrameAnalyticsListAction, DataFrameAnalyticsListRow } from '../analytics_list/common';

import { editActionNameText, EditActionName } from './edit_action_name';

export const isEditActionFlyoutVisible = (editAction: any): editAction is Required<EditAction> => {
  return editAction.isFlyoutVisible === true && editAction.item !== undefined;
};

export interface EditAction {
  isFlyoutVisible: boolean;
  item?: DataFrameAnalyticsListRow;
  closeFlyout: () => void;
  openFlyout: (newItem: DataFrameAnalyticsListRow) => void;
}
export const useEditAction = (canStartStopDataFrameAnalytics: boolean) => {
  const [item, setItem] = useState<DataFrameAnalyticsListRow>();

  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const closeFlyout = () => setIsFlyoutVisible(false);
  const openFlyout = (newItem: DataFrameAnalyticsListRow) => {
    setItem(newItem);
    setIsFlyoutVisible(true);
  };

  const action: DataFrameAnalyticsListAction = useMemo(
    () => ({
      name: () => <EditActionName isDisabled={!canStartStopDataFrameAnalytics} />,
      enabled: () => canStartStopDataFrameAnalytics,
      description: editActionNameText,
      icon: 'pencil',
      type: 'icon',
      onClick: (i: DataFrameAnalyticsListRow) => openFlyout(i),
      'data-test-subj': 'mlAnalyticsJobEditButton',
    }),
    [canStartStopDataFrameAnalytics]
  );

  return {
    action,
    isFlyoutVisible,
    item,
    closeFlyout,
    openFlyout,
  };
};
