/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { HttpSetup } from '@kbn/core-http-browser';

import { Index } from '../../../../../../common';
import {
  clearCacheIndices as clearCacheIndicesRequest,
  closeIndices as closeIndicesRequest,
  deleteIndices as deleteIndicesRequest,
  flushIndices as flushIndicesRequest,
  forcemergeIndices as forcemergeIndicesRequest,
  openIndices as openIndicesRequest,
  refreshIndices as refreshIndicesRequest,
  unfreezeIndices as unfreezeIndicesRequest,
} from '../../../../services';
import { notificationService } from '../../../../services/notification';
import { httpService } from '../../../../services/http';

import {
  IndexActionsContextMenu,
  IndexActionsContextMenuProps,
} from '../index_actions_context_menu/index_actions_context_menu';

const getIndexStatusByName = (
  indexNames: string[],
  indices: Index[]
): IndexActionsContextMenuProps['indexStatusByName'] => {
  const indexStatusByName: IndexActionsContextMenuProps['indexStatusByName'] = {};
  indexNames.forEach((indexName) => {
    const { status } = indices.find((index) => index.name === indexName) ?? {};
    indexStatusByName[indexName] = status;
  });
  return indexStatusByName;
};

interface Props {
  indexName: string;
  indexDetails: Index;
  reloadIndexDetails: () => void;
  navigateToAllIndices: () => void;
}
export const ManageIndexButton: FunctionComponent<Props> = ({
  indexName,
  indexDetails,
  reloadIndexDetails,
  navigateToAllIndices,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  // the variables are created to write the index actions in a way to later re-use for indices list without redux
  const indexNames = useMemo(() => [indexName], [indexName]);
  const reloadIndices = reloadIndexDetails;
  const indices = [indexDetails];
  const indexStatusByName = getIndexStatusByName(indexNames, indices);

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
      reloadIndices();
    } catch (error) {
      setIsLoading(false);
      notificationService.showDangerToast(error.body.message);
    }
  }, [reloadIndices, indexNames]);

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
      reloadIndices();
    } catch (error) {
      setIsLoading(false);
      notificationService.showDangerToast(error.body.message);
    }
  }, [reloadIndices, indexNames]);

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
      reloadIndices();
    } catch (error) {
      setIsLoading(false);
      notificationService.showDangerToast(error.body.message);
    }
  }, [reloadIndices, indexNames]);

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
      reloadIndices();
    } catch (error) {
      setIsLoading(false);
      notificationService.showDangerToast(error.body.message);
    }
  }, [reloadIndices, indexNames]);

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
      reloadIndices();
    } catch (error) {
      setIsLoading(false);
      notificationService.showDangerToast(error.body.message);
    }
  }, [reloadIndices, indexNames]);

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
      reloadIndices();
    } catch (error) {
      setIsLoading(false);
      notificationService.showDangerToast(error.body.message);
    }
  }, [reloadIndices, indexNames]);

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
        reloadIndices();
      } catch (error) {
        setIsLoading(false);
        notificationService.showDangerToast(error.body.message);
      }
    },
    [reloadIndices, indexNames]
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
      navigateToAllIndices();
    } catch (error) {
      setIsLoading(false);
      notificationService.showDangerToast(error.body.message);
    }
  }, [navigateToAllIndices, indexNames]);

  const performExtensionAction = useCallback(
    async (
      requestMethod: (indexNames: string[], http: HttpSetup) => Promise<void>,
      successMessage: string
    ) => {
      setIsLoading(true);
      try {
        await requestMethod(indexNames, httpService.httpClient);
        setIsLoading(false);
        notificationService.showSuccessToast(successMessage);
        reloadIndices();
      } catch (error) {
        setIsLoading(false);
        notificationService.showDangerToast(error.body.message);
      }
    },
    [reloadIndices, indexNames]
  );

  return (
    <IndexActionsContextMenu
      indexNames={indexNames}
      indices={indices}
      indexStatusByName={indexStatusByName}
      fill={false}
      isLoading={isLoading}
      // index actions
      closeIndices={closeIndices}
      openIndices={openIndices}
      flushIndices={flushIndices}
      refreshIndices={refreshIndices}
      clearCacheIndices={clearCacheIndices}
      unfreezeIndices={unfreezeIndices}
      forcemergeIndices={forcemergeIndices}
      deleteIndices={deleteIndices}
      performExtensionAction={performExtensionAction}
      reloadIndices={reloadIndices}
    />
  );
};
