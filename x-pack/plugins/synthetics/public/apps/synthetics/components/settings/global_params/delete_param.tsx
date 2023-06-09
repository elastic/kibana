/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { FETCH_STATUS, useFetcher } from '@kbn/observability-shared-plugin/public';
import { toMountPoint, useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';

import { useDispatch } from 'react-redux';
import { getGlobalParamAction, deleteGlobalParams } from '../../../state/global_params';
import { syncGlobalParamsAction } from '../../../state/settings';
import { kibanaService } from '../../../../../utils/kibana_service';
import { NO_LABEL, YES_LABEL } from '../../monitors_page/management/monitor_list_table/labels';
import { ListParamItem } from './params_list';

export const DeleteParam = ({
  items,
  setIsDeleteModalVisible,
}: {
  items: ListParamItem[];
  setIsDeleteModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const dispatch = useDispatch();

  const handleConfirmDelete = () => {
    setIsDeleting(true);
  };

  const { savedObjects } = useKibana().services;

  const { status } = useFetcher(() => {
    if (isDeleting && savedObjects) {
      return deleteGlobalParams({ ids: items.map(({ id }) => id) });
    }
  }, [items, isDeleting]);

  const name = items
    .map(({ key }) => key)
    .join(', ')
    .substr(0, 50);

  useEffect(() => {
    if (!isDeleting) {
      return;
    }
    if (status === FETCH_STATUS.FAILURE) {
      kibanaService.toasts.addDanger(
        {
          title: toMountPoint(
            <p data-test-subj="uptimeDeleteParamFailure">
              {' '}
              {i18n.translate('xpack.synthetics.paramManagement.paramDeleteFailuresMessage.name', {
                defaultMessage: 'Param {name} deleted successfully.',
                values: { name },
              })}
            </p>
          ),
        },
        { toastLifeTimeMs: 3000 }
      );
    } else if (status === FETCH_STATUS.SUCCESS) {
      kibanaService.toasts.addSuccess(
        {
          title: toMountPoint(
            <p data-test-subj="uptimeDeleteParamSuccess">
              {i18n.translate('xpack.synthetics.paramManagement.paramDeleteSuccessMessage.name', {
                defaultMessage: 'Param {name} deleted successfully.',
                values: { name },
              })}
            </p>
          ),
        },
        { toastLifeTimeMs: 3000 }
      );
      dispatch(syncGlobalParamsAction.get());
    }
    if (status === FETCH_STATUS.SUCCESS || status === FETCH_STATUS.FAILURE) {
      setIsDeleting(false);
      setIsDeleteModalVisible(false);
      dispatch(getGlobalParamAction.get());
      dispatch(syncGlobalParamsAction.get());
    }
  }, [setIsDeleting, isDeleting, status, setIsDeleteModalVisible, name, dispatch]);

  return (
    <EuiConfirmModal
      title={i18n.translate('xpack.synthetics.paramManagement.deleteParamNameLabel', {
        defaultMessage: 'Delete "{name}" param?',
        values: { name },
      })}
      onCancel={() => setIsDeleteModalVisible(false)}
      onConfirm={handleConfirmDelete}
      cancelButtonText={NO_LABEL}
      confirmButtonText={YES_LABEL}
      buttonColor="danger"
      defaultFocusedButton="confirm"
      isLoading={isDeleting}
    />
  );
};
