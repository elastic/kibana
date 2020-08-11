/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState } from 'react';

import { DataFrameAnalyticsListRow } from '../analytics_list/common';

export const isEditActionFlyoutVisible = (editAction: any): editAction is Required<EditAction> => {
  return editAction.isFlyoutVisible === true && editAction.item !== undefined;
};

export interface EditAction {
  isFlyoutVisible: boolean;
  item?: DataFrameAnalyticsListRow;
  closeFlyout: () => void;
  openFlyout: (newItem: DataFrameAnalyticsListRow) => void;
}
export const useEditAction = () => {
  const [item, setItem] = useState<DataFrameAnalyticsListRow>();

  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const closeFlyout = () => setIsFlyoutVisible(false);
  const openFlyout = (newItem: DataFrameAnalyticsListRow) => {
    setItem(newItem);
    setIsFlyoutVisible(true);
  };

  return {
    isFlyoutVisible,
    item,
    closeFlyout,
    openFlyout,
  };
};
