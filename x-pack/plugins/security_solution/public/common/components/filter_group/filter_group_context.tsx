/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ControlGroupContainer, ControlGroupInput } from '@kbn/controls-plugin/public';
import { createContext } from 'react';
import type { FilterItemObj } from './types';

export interface FilterGroupContextType {
  initialControls: FilterItemObj[];
  dataViewId: string;
  controlGroup: ControlGroupContainer | undefined;
  controlGroupInputUpdates: ControlGroupInput | undefined;
  isViewMode: boolean;
  hasPendingChanges: boolean;
  pendingChangesPopoverOpen: boolean;
  closePendingChangesPopover: () => void;
  openPendingChangesPopover: () => void;
  switchToViewMode: () => void;
  switchToEditMode: () => void;
  setHasPendingChanges: (value: boolean) => void;
  setShowFiltersChangedBanner: (value: boolean) => void;
}

export const FilterGroupContext = createContext<FilterGroupContextType | undefined>(undefined);
