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

  const hostInput = useInput(downloadSource?.host, validateHost);

  const inputs = {
    nameInput,
    hostInput,
    defaultDownloadSourceInput,
  };

  const hasChanged = Object.values(inputs).some((input) => input.hasChanged);

  const validate = useCallback(() => {
    const nameInputValid = nameInput.validate();

    return nameInputValid;
  }, [nameInput]);

  const submit = useCallback(async () => {
    try {
      if (!validate()) {
        return;
      }
      setIsloading(true);

      const data: PostDownloadSourceRequest['body'] = {
        name: nameInput.value,
        host: hostInput.value,
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

function validateHost(value: string) {
  const res = [];
  try {
    if (value.match(/^http([s]){0,1}:\/\//)) {
      res.push(
        i18n.translate('xpack.fleet.settings.dowloadSourceFlyoutForm.hostProtocolError', {
          defaultMessage: 'Host address must begin with a domain name or IP address',
        })
      );
      return;
    }

    const url = new URL(`http://${value}`);

    if (url.host !== value) {
      throw new Error('Invalid host');
    }
  } catch (error) {
    if (!value) {
      res.push(
        i18n.translate('xpack.fleet.settings.dowloadSourceFlyoutForm.hostRequiredError', {
          defaultMessage: 'Host is required',
        })
      );
    } else {
      res.push(
        i18n.translate('xpack.fleet.settings.dowloadSourceFlyoutForm.hostError', {
          defaultMessage: 'Invalid Host',
        })
      );
    }
  }

  if (res.length) {
    return res;
  }
}
