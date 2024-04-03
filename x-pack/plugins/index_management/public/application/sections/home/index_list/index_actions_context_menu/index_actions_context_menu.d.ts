/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ClassComponent, Component } from 'react';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { EuiPopoverProps, EuiButtonProps } from '@elastic/eui';
import type { Index } from '../../../../../../common';

export interface IndexActionsContextMenuProps {
  // either an array of indices selected in the list view or an array of 1 index name on the details panel/page
  indexNames: string[];
  // indices data
  indices: Index[];

  // indicates if the context menu is on the list view (to show additional actions)
  isOnListView?: boolean;
  // a callback used to reset selected indices on the list view
  resetSelection?: () => void;

  // these props are only set on the details panel to change style
  anchorPosition?: EuiPopoverProps['anchorPosition'];
  iconSide?: EuiButtonProps['iconSide'];
  iconType?: EuiButtonProps['iconType'];
  label?: Component;

  // index actions: functions are called with indexNames prop so no need to pass it as argument here
  closeIndices: () => Promise<void>;
  openIndices: () => Promise<void>;
  flushIndices: () => Promise<void>;
  refreshIndices: () => Promise<void>;
  clearCacheIndices: () => Promise<void>;
  unfreezeIndices: () => Promise<void>;
  forcemergeIndices: (maxNumSegments: string) => Promise<void>;
  deleteIndices: () => Promise<void>;

  // used to determine if all indices are open
  indexStatusByName: {
    [indexName: string]: Index['status'] | undefined;
  };

  // this function is called with an extension service action
  performExtensionAction: (
    requestMethod: (indexNames: string[], http: HttpSetup) => Promise<void>,
    successMessage: string
  ) => Promise<void>;
  // this function is called to "refresh" the indices data after and extension service action that uses a modal
  reloadIndices: () => void;

  /**
   * Props added to use the context menu on the new index details page
   */
  // makes the button secondary
  fill?: boolean;
  // sets the button's loading state
  isLoading?: boolean;
}

export const IndexActionsContextMenu: ClassComponent<Props>;
