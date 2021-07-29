/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FilterManager } from '../../../../../../../src/plugins/data/public';

export interface FilterValueFnArgs {
  field: string;
  value: string[] | string | null | undefined;
  filterManager: FilterManager | undefined;
  onFilterAdded: (() => void) | undefined;
}

export interface HoverActionComponentProps {
  field: string;
  onClick?: () => void;
  ownFocus: boolean;
  showTooltip?: boolean;
  value?: string[] | string | null;
}
