/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface FilterItemActionsProps {
  disabled?: boolean;

  disableRemove?: boolean;
  onRemoveFilter: () => void;

  hideOr?: boolean;
  disableOr?: boolean;
  onOrButtonClick: () => void;

  hideAnd?: boolean;
  disableAnd?: boolean;
  onAddButtonClick: () => void;
}
