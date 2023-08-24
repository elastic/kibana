/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useCallback, useState } from 'react';
import { HttpSetup } from '@kbn/core-http-browser';
import { EuiButtonProps } from '@elastic/eui/src/components/button/button';
import { EuiPopoverProps } from '@elastic/eui/src/components/popover/popover';
import { i18n } from '@kbn/i18n';
import { Index } from '../../../../../../common';
import {
  reloadIndices,
  closeIndices as closeIndicesRequest,
  openIndices as openIndicesRequest,
  flushIndices as flushIndicesRequest,
  refreshIndices as refreshIndicesRequest,
  clearCacheIndices as clearCacheIndicesRequest,
  unfreezeIndices as unfreezeIndicesRequest,
  forcemergeIndices as forcemergeIndicesRequest,
  deleteIndices as deleteIndicesRequest,
} from '../../../../services';
import { notificationService } from '../../../../services/notification';
// @ts-ignore this component needs to be refactored into TS
import { IndexActionsContextMenu } from './index_actions_context_menu';

export interface ReduxProps {
  closeIndices: () => Promise<void>;
  openIndices: () => Promise<void>;
  flushIndices: () => Promise<void>;
  refreshIndices: () => Promise<void>;
  clearCacheIndices: () => Promise<void>;
  unfreezeIndices: () => Promise<void>;
  forcemergeIndices: (maxNumSegments: string) => Promise<void>;
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

  // a function to reload index details
  reloadIndexDetails?: () => void;

  // a function to navigate back to all indices (after index deletion)
  navigateToAllIndices?: () => void;
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
  reloadIndexDetails,
  navigateToAllIndices,
  ...rest
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const closeIndices = useCallback(async () => {
    setIsLoading(true);
    try {
      await closeIndicesRequest(indexNames);
      setIsLoading(false);
      notificationService.showSuccessToast(
        i18n.translate('xpack.idxMgmt.closeIndicesAction.successfullyClosedIndicesMessage', {
          defaultMessage: 'Successfully closed: [{indexNames}]',
          values: { indexNames: indexNames.join(', ') },
        })
      );
      reloadIndexDetails?.();
    } catch (error) {
      setIsLoading(false);
      notificationService.showDangerToast(error.body.message);
    }
  }, [reloadIndexDetails, indexNames]);

  const openIndices = useCallback(async () => {
    setIsLoading(true);
    try {
      await openIndicesRequest(indexNames);
      setIsLoading(false);
      notificationService.showSuccessToast(
        i18n.translate('xpack.idxMgmt.openIndicesAction.successfullyOpenedIndicesMessage', {
          defaultMessage: 'Successfully opened: [{indexNames}]',
          values: { indexNames: indexNames.join(', ') },
        })
      );
      reloadIndexDetails?.();
    } catch (error) {
      setIsLoading(false);
      notificationService.showDangerToast(error.body.message);
    }
  }, [reloadIndexDetails, indexNames]);

  const flushIndices = useCallback(async () => {
    setIsLoading(true);
    try {
      await flushIndicesRequest(indexNames);
      setIsLoading(false);
      notificationService.showSuccessToast(
        i18n.translate('xpack.idxMgmt.flushIndicesAction.successfullyFlushedIndicesMessage', {
          defaultMessage: 'Successfully flushed: [{indexNames}]',
          values: { indexNames: indexNames.join(', ') },
        })
      );
      reloadIndexDetails?.();
    } catch (error) {
      setIsLoading(false);
      notificationService.showDangerToast(error.body.message);
    }
  }, [reloadIndexDetails, indexNames]);

  const refreshIndices = useCallback(async () => {
    setIsLoading(true);
    try {
      await refreshIndicesRequest(indexNames);
      setIsLoading(false);
      notificationService.showSuccessToast(
        i18n.translate('xpack.idxMgmt.refreshIndicesAction.successfullyRefreshedIndicesMessage', {
          defaultMessage: 'Successfully refreshed: [{indexNames}]',
          values: { indexNames: indexNames.join(', ') },
        })
      );
      reloadIndexDetails?.();
    } catch (error) {
      setIsLoading(false);
      notificationService.showDangerToast(error.body.message);
    }
  }, [reloadIndexDetails, indexNames]);

  const clearCacheIndices = useCallback(async () => {
    setIsLoading(true);
    try {
      await clearCacheIndicesRequest(indexNames);
      setIsLoading(false);
      notificationService.showSuccessToast(
        i18n.translate('xpack.idxMgmt.clearCacheIndicesAction.successMessage', {
          defaultMessage: 'Successfully cleared cache: [{indexNames}]',
          values: { indexNames: indexNames.join(', ') },
        })
      );
      reloadIndexDetails?.();
    } catch (error) {
      setIsLoading(false);
      notificationService.showDangerToast(error.body.message);
    }
  }, [reloadIndexDetails, indexNames]);

  const unfreezeIndices = useCallback(async () => {
    setIsLoading(true);
    try {
      await unfreezeIndicesRequest(indexNames);
      setIsLoading(false);
      notificationService.showSuccessToast(
        i18n.translate('xpack.idxMgmt.unfreezeIndicesAction.successfullyUnfrozeIndicesMessage', {
          defaultMessage: 'Successfully unfroze: [{indexNames}]',
          values: { indexNames: indexNames.join(', ') },
        })
      );
      reloadIndexDetails?.();
    } catch (error) {
      setIsLoading(false);
      notificationService.showDangerToast(error.body.message);
    }
  }, [reloadIndexDetails, indexNames]);

  const forcemergeIndices = useCallback(
    async (maxNumSegments: string) => {
      setIsLoading(true);
      try {
        await forcemergeIndicesRequest(indexNames, maxNumSegments);
        setIsLoading(false);
        notificationService.showSuccessToast(
          i18n.translate(
            'xpack.idxMgmt.forceMergeIndicesAction.successfullyForceMergedIndicesMessage',
            {
              defaultMessage: 'Successfully force merged: [{indexNames}]',
              values: { indexNames: indexNames.join(', ') },
            }
          )
        );
        reloadIndexDetails?.();
      } catch (error) {
        setIsLoading(false);
        notificationService.showDangerToast(error.body.message);
      }
    },
    [reloadIndexDetails, indexNames]
  );

  const deleteIndices = useCallback(async () => {
    setIsLoading(true);
    try {
      await deleteIndicesRequest(indexNames);
      setIsLoading(false);
      notificationService.showSuccessToast(
        i18n.translate('xpack.idxMgmt.deleteIndicesAction.successfullyDeletedIndicesMessage', {
          defaultMessage: 'Successfully deleted: [{indexNames}]',
          values: { indexNames: indexNames.join(', ') },
        })
      );
      navigateToAllIndices?.();
    } catch (error) {
      setIsLoading(false);
      notificationService.showDangerToast(error.body.message);
    }
  }, [navigateToAllIndices, indexNames]);

  const props: ReduxProps = {
    closeIndices,
    openIndices,
    flushIndices,
    refreshIndices,
    clearCacheIndices,
    unfreezeIndices,
    forcemergeIndices,
    deleteIndices,

    // there actions are not displayed on the index details page
    showSettings: () => {},
    showMapping: () => {},
    showStats: () => {},
    editIndex: () => {},

    indexStatusByName: getIndexStatusByName(indexNames, indices),
    reloadIndices: async () => {},

    performExtensionAction: async () => {},
  };

  return (
    <IndexActionsContextMenu
      indexNames={indexNames}
      indices={indices}
      isLoading={isLoading}
      {...props}
      {...rest}
    />
  );
};
