/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption, IconType } from '@elastic/eui';

export interface UseActionProps {
  onAction: () => void;
  onActionSuccess: () => void;
  isDisabled: boolean;
}

export interface UseCopyIDActionProps {
  onActionSuccess: () => void;
}

export interface ItemsSelectionState {
  selectedItems: string[];
  unSelectedItems: string[];
}

export type ItemSelectableOption<T extends {} = {}> = EuiSelectableOption<
  T & { key: string; itemIcon: IconType; newItem?: boolean }
>;
