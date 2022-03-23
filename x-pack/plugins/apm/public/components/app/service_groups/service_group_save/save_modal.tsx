/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import datemath from '@elastic/datemath';
import { EuiModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import React, { useCallback, useEffect, useState } from 'react';
import { callApmApi } from '../../../../services/rest/create_call_apm_api';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { GroupDetails } from './group_details';
import { SelectServices } from './select_services';
import {
  ServiceGroup,
  SavedServiceGroup,
} from '../../../../../common/service_groups';
import { refreshServiceGroups } from '../refresh_service_groups_subscriber';

interface Props {
  onClose: () => void;
  savedServiceGroup?: SavedServiceGroup;
}

type ModalView = 'group_details' | 'select_service';

export type StagedServiceGroup = Pick<
  ServiceGroup,
  'groupName' | 'color' | 'description' | 'kuery'
>;

export function SaveGroupModal({ onClose, savedServiceGroup }: Props) {
  const {
    core: { notifications },
  } = useApmPluginContext();
  const [modalView, setModalView] = useState<ModalView>('group_details');
  const [stagedServiceGroup, setStagedServiceGroup] = useState<
    StagedServiceGroup | undefined
  >(savedServiceGroup);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    setStagedServiceGroup(savedServiceGroup);
  }, [savedServiceGroup]);

  const isEdit = !!savedServiceGroup;

  const history = useHistory();

  const navigateToServiceGroups = useCallback(() => {
    history.push({
      ...history.location,
      pathname: '/service-groups',
      search: '',
    });
  }, [history]);

  const onSave = useCallback(
    async function (newServiceGroup: StagedServiceGroup) {
      setIsLoading(true);
      try {
        const start = datemath.parse('now-24h')?.toISOString();
        const end = datemath.parse('now', { roundUp: true })?.toISOString();
        if (!start || !end) {
          throw new Error('Unable to determine start/end time range.');
        }
        await callApmApi('POST /internal/apm/service-group', {
          params: {
            query: { start, end, serviceGroupId: savedServiceGroup?.id },
            body: {
              groupName: newServiceGroup.groupName,
              kuery: newServiceGroup.kuery,
              description: newServiceGroup.description,
              color: newServiceGroup.color,
            },
          },
          signal: null,
        });
        notifications.toasts.addSuccess(
          isEdit
            ? getEditSuccessToastLabels(newServiceGroup)
            : getCreateSuccessToastLabels(newServiceGroup)
        );
        refreshServiceGroups();
        navigateToServiceGroups();
      } catch (error) {
        console.error(error);
        notifications.toasts.addDanger(
          isEdit
            ? getEditFailureToastLabels(newServiceGroup, error)
            : getCreateFailureToastLabels(newServiceGroup, error)
        );
      }
      onClose();
      setIsLoading(false);
    },
    [
      savedServiceGroup?.id,
      notifications.toasts,
      onClose,
      isEdit,
      navigateToServiceGroups,
    ]
  );

  const onDelete = useCallback(
    async function () {
      setIsLoading(true);
      if (!savedServiceGroup) {
        notifications.toasts.addDanger(
          getDeleteFailureUnknownIdToastLabels(stagedServiceGroup!)
        );
        return;
      }
      try {
        await callApmApi('DELETE /internal/apm/service-group', {
          params: { query: { serviceGroupId: savedServiceGroup.id } },
          signal: null,
        });
        notifications.toasts.addSuccess(
          getDeleteSuccessToastLabels(stagedServiceGroup!)
        );
        refreshServiceGroups();
        navigateToServiceGroups();
      } catch (error) {
        console.error(error);
        notifications.toasts.addDanger(
          getDeleteFailureToastLabels(stagedServiceGroup!, error)
        );
      }
      onClose();
      setIsLoading(false);
    },
    [
      stagedServiceGroup,
      notifications.toasts,
      onClose,
      navigateToServiceGroups,
      savedServiceGroup,
    ]
  );

  return (
    <EuiModal onClose={onClose}>
      {modalView === 'group_details' && (
        <GroupDetails
          serviceGroup={stagedServiceGroup}
          isEdit={isEdit}
          onCloseModal={onClose}
          onClickNext={(_serviceGroup) => {
            setStagedServiceGroup(_serviceGroup);
            setModalView('select_service');
          }}
          onDeleteGroup={onDelete}
          isLoading={isLoading}
        />
      )}
      {modalView === 'select_service' && stagedServiceGroup && (
        <SelectServices
          serviceGroup={stagedServiceGroup}
          isEdit={isEdit}
          onCloseModal={onClose}
          onSaveClick={onSave}
          onEditGroupDetailsClick={() => {
            setModalView('group_details');
          }}
          isLoading={isLoading}
        />
      )}
    </EuiModal>
  );
}

function getCreateSuccessToastLabels({ groupName }: StagedServiceGroup) {
  return {
    title: i18n.translate('xpack.apm.serviceGroups.createSucess.toast.title', {
      defaultMessage: 'Created "{groupName}" group',
      values: { groupName },
    }),
    text: i18n.translate('xpack.apm.serviceGroups.createSuccess.toast.text', {
      defaultMessage:
        'Your group is now visible in the new Services view for groups.',
    }),
  };
}

function getEditSuccessToastLabels({ groupName }: StagedServiceGroup) {
  return {
    title: i18n.translate('xpack.apm.serviceGroups.editSucess.toast.title', {
      defaultMessage: 'Edited "{groupName}" group',
      values: { groupName },
    }),
    text: i18n.translate('xpack.apm.serviceGroups.editSuccess.toast.text', {
      defaultMessage: 'Saved new changes to service group.',
    }),
  };
}

function getCreateFailureToastLabels(
  { groupName }: StagedServiceGroup,
  error: Error & { body: { message: string } }
) {
  return {
    title: i18n.translate('xpack.apm.serviceGroups.createFailure.toast.title', {
      defaultMessage: 'Error while creating "{groupName}" group',
      values: { groupName },
    }),
    text: error.body.message,
  };
}

function getEditFailureToastLabels(
  { groupName }: StagedServiceGroup,
  error: Error & { body: { message: string } }
) {
  return {
    title: i18n.translate('xpack.apm.serviceGroups.editFailure.toast.title', {
      defaultMessage: 'Error while editing "{groupName}" group',
      values: { groupName },
    }),
    text: error.body.message,
  };
}

function getDeleteSuccessToastLabels({ groupName }: StagedServiceGroup) {
  return {
    title: i18n.translate('xpack.apm.serviceGroups.deleteSuccess.toast.title', {
      defaultMessage: 'Deleted "{groupName}" group',
      values: { groupName },
    }),
  };
}

function getDeleteFailureUnknownIdToastLabels({
  groupName,
}: StagedServiceGroup) {
  return {
    title: i18n.translate(
      'xpack.apm.serviceGroups.deleteFailure.unknownId.toast.title',
      {
        defaultMessage: 'Error while deleting "{groupName}" group',
        values: { groupName },
      }
    ),
    text: i18n.translate(
      'xpack.apm.serviceGroups.deleteFailure.unknownId.toast.text',
      { defaultMessage: 'Unable to delete group: unknown service group id.' }
    ),
  };
}

function getDeleteFailureToastLabels(
  { groupName }: StagedServiceGroup,
  error: Error & { body: { message: string } }
) {
  return {
    title: i18n.translate('xpack.apm.serviceGroups.deleteFailure.toast.title', {
      defaultMessage: 'Error while deleting "{groupName}" group',
      values: { groupName },
    }),
    text: error.body.message,
  };
}
