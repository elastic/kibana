/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

import { i18n } from '@kbn/i18n';

import {
  sendPostDownloadSource,
  useInput,
  useSwitchInput,
  useStartServices,
  sendPutDownloadSource,
} from '../../../../hooks';
import type { DownloadSource, PostDownloadSourceRequest } from '../../../../types';
import { useConfirmModal } from '../../hooks/use_confirm_modal';

import { confirmUpdate } from './confirm_update';

export function useDowloadSourceFlyoutForm(onSuccess: () => void, downloadSource?: DownloadSource) {
  const [isLoading, setIsloading] = useState(false);
  const { notifications } = useStartServices();
  const { confirm } = useConfirmModal();

  const nameInput = useInput(downloadSource?.name ?? '', validateName);

  const defaultDownloadSourceInput = useSwitchInput(
    downloadSource?.is_default ?? false,
    downloadSource?.is_default
  );

  const hostInput = useInput(downloadSource?.host ?? '', validateHost);

  const inputs = {
    nameInput,
    hostInput,
    defaultDownloadSourceInput,
  };

  const hasChanged = Object.values(inputs).some((input) => input.hasChanged);

  const validate = useCallback(() => {
    const nameInputValid = nameInput.validate();
    const hostValid = hostInput.validate();

    return nameInputValid && hostValid;
  }, [nameInput, hostInput]);

  const submit = useCallback(async () => {
    try {
      if (!validate()) {
        return;
      }
      setIsloading(true);

      const data: PostDownloadSourceRequest['body'] = {
        name: nameInput.value.trim(),
        host: hostInput.value.trim(),
        is_default: defaultDownloadSourceInput.value,
      };

      if (downloadSource) {
        // Update
        if (!(await confirmUpdate(downloadSource, confirm))) {
          setIsloading(false);
          return;
        }

        const res = await sendPutDownloadSource(downloadSource.id, data);
        if (res.error) {
          throw res.error;
        }
      } else {
        // Create
        const res = await sendPostDownloadSource(data);
        if (res.error) {
          throw res.error;
        }
      }

      onSuccess();
      setIsloading(false);
    } catch (err) {
      setIsloading(false);
      notifications.toasts.addError(err, {
        title: i18n.translate('xpack.fleet.settings.dowloadSourceFlyoutForm.errorToastTitle', {
          defaultMessage: 'Error while saving binary source',
        }),
      });
    }
  }, [
    confirm,
    defaultDownloadSourceInput.value,
    downloadSource,
    hostInput.value,
    nameInput.value,
    notifications.toasts,
    onSuccess,
    validate,
  ]);

  return {
    inputs,
    submit,
    isLoading,
    isDisabled: isLoading || (downloadSource && !hasChanged),
  };
}

function validateName(value: string) {
  if (!value || value === '') {
    return [
      i18n.translate('xpack.fleet.settings.dowloadSourceFlyoutForm.nameIsRequiredErrorMessage', {
        defaultMessage: 'Name is required',
      }),
    ];
  }
}

export function validateHost(value: string) {
  try {
    if (!value) {
      return [
        i18n.translate('xpack.fleet.settings.dowloadSourceFlyoutForm.HostIsRequiredErrorMessage', {
          defaultMessage: 'Host is required',
        }),
      ];
    }
    const urlParsed = new URL(value);
    if (!['http:', 'https:'].includes(urlParsed.protocol)) {
      throw new Error('Invalid protocol');
    }
  } catch (error) {
    return [
      i18n.translate('xpack.fleet.settings.dowloadSourceFlyoutForm.hostError', {
        defaultMessage: 'Invalid URL',
      }),
    ];
  }
}
