/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { HttpSetup } from '@kbn/core-http-browser';
import { EuiButtonProps } from '@elastic/eui/src/components/button/button';
import { EuiPopoverProps } from '@elastic/eui/src/components/popover/popover';
import { Index } from '../../../../../../common';
import { reloadIndices } from '../../../../services';
// @ts-ignore this component needs to be refactored into TS
import { IndexActionsContextMenu } from './index_actions_context_menu';

export interface ReduxProps {
  closeIndices: ({}: { indexNames: string[] }) => Promise<void>;
  openIndices: ({}: { indexNames: string[] }) => Promise<void>;
  flushIndices: ({}: { indexNames: string[] }) => Promise<void>;
  refreshIndices: ({}: { indexNames: string[] }) => Promise<void>;
  clearCacheIndices: ({}: { indexNames: string[] }) => Promise<void>;
  unfreezeIndices: ({}: { indexNames: string[] }) => Promise<void>;
  forcemergeIndices: ({}: { indexNames: string[]; maxNumSegments: number }) => Promise<void>;
  deleteIndices: ({}: { indexNames: string[] }) => Promise<void>;

  // following 4 actions are only added when on the list view and only 1 index is selected
  showSettings: ({}: { indexNames: string[] }) => void; // opens the settings tab for the 1st index
  showMapping: ({}: { indexNames: string[] }) => void; // opens the mapping tab for the 1st index
  showStats: ({}: { indexNames: string[] }) => void; // opens the stats tab for the 1st index
  editIndex: ({}: { indexNames: string[] }) => void; // opens the edit settings tab for the 1st index

  indexStatusByName: {
    [indexName: string]: Index['status'] | undefined;
  };
  reloadIndices: typeof reloadIndices;

  // this comes from the extension service
  performExtensionAction: ({}: {
    requestMethod: (indexNames: string[], httpClient: HttpSetup) => Promise<void>;
    indexNames: string[];
    successMessage: string;
  }) => Promise<void>;
}

interface Props {
  // either an array of indices selected in the list view or an array of 1 index name on details panel/page
  indexNames: string[];

  // indicates if the context menu is on the list view (to show additional actions)
  isOnListView?: boolean;
  // a callback used to reset selected indices on the list view
  resetSelection?: () => void;

  // these props are only set on the details panel to change style
  anchorPosition?: EuiPopoverProps['anchorPosition'];
  iconSide?: EuiButtonProps['iconSide'];
  iconType?: EuiButtonProps['iconType'];
  label?: React.Component;

  // a new prop to make the button secondary
  fill?: boolean;

  // instead of getting indices data from the redux store, pass it as a prop
  indices: Index[];
}

const getIndexStatusByName = (
  indexNames: string[],
  indices: Index[]
): ReduxProps['indexStatusByName'] => {
  const indexStatusByName: ReduxProps['indexStatusByName'] = {};
  indexNames.forEach((indexName) => {
    const { status } = indices.find((index) => index.name === indexName) ?? {};
    indexStatusByName[indexName] = status;
  });
  return indexStatusByName;
};

export const IndexActionsContextMenuWithoutRedux: FunctionComponent<Props> = ({
  indexNames,
  indices,
  ...rest
}) => {
  const props: ReduxProps = {
    closeIndices: async () => {},
    openIndices: async () => {},
    flushIndices: async () => {},
    refreshIndices: async () => {},
    clearCacheIndices: async () => {},
    unfreezeIndices: async () => {},
    forcemergeIndices: async () => {},
    deleteIndices: async () => {},

    // there actions are not displayed on the index details page
    showSettings: () => {},
    showMapping: () => {},
    showStats: () => {},
    editIndex: () => {},

    indexStatusByName: getIndexStatusByName(indexNames, indices),
    reloadIndices: async () => {},

    performExtensionAction: async () => {},
  };
  return <IndexActionsContextMenu indexNames={indexNames} indices={indices} {...props} {...rest} />;
};
