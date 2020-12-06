/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIconType } from '@elastic/eui/src/components/icon/icon';

/**
 * Represents a tag `bulk action`
 */
export interface TagBulkAction {
  /**
   * The unique identifier for this action.
   */
  id: string;
  /**
   * The label displayed in the bulk action context menu.
   */
  label: string;
  /**
   * Optional aria-label if the visual label isn't descriptive enough.
   */
  'aria-label'?: string;
  /**
   * An optional icon to display before the label in the context menu.
   */
  icon?: EuiIconType;
  /**
   * Handler to execute this action against the given list of selected tag ids.
   */
  execute: (tagIds: string[]) => void | Promise<void>;
  /**
   * If true, the list of tags will be reloaded after the action's execution. Defaults to false.
   */
  refreshAfterExecute?: boolean;
}
