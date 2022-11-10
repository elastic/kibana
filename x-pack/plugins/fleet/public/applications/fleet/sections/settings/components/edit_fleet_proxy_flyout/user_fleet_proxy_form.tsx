/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// copy this one
import React, { useCallback, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  sendPostFleetProxy,
  sendPutFleetServerHost,
  useInput,
  useStartServices,
} from '../../../../hooks';
import { isDiffPathProtocol } from '../../../../../../../common/services';
import { useConfirmModal } from '../../hooks/use_confirm_modal';
import type { FleetProxy } from '../../../../types';

const URL_REGEX = /^(https):\/\/[^\s$.?#].[^\s]*$/gm;

const ConfirmTitle = () => (
  <FormattedMessage
    id="xpack.fleet.settings.fleetServerHostsFlyout.confirmModalTitle"
    defaultMessage="Save and deploy changes?"
  />
);

const ConfirmDescription: React.FunctionComponent = ({}) => (
  <FormattedMessage
    id="xpack.fleet.settings.fleetServerHostsFlyout.confirmModalText"
    defaultMessage="This action will update agent policies enrolled in this Fleet Server. This action can not be undone. Are you sure you wish to continue?"
  />
);

export function validateFleetServerHosts(value: string[]) {
  if (value.length === 0) {
    return [
      {
        message: i18n.translate('xpack.fleet.settings.fleetServerHostsEmptyError', {
          defaultMessage: 'At least one URL is required',
        }),
      },
    ];
  }

  const res: Array<{ message: string; index: number }> = [];
  const hostIndexes: { [key: string]: number[] } = {};
  value.forEach((val, idx) => {
    if (!val) {
      res.push({
        message: i18n.translate('xpack.fleet.settings.fleetServerHostsRequiredError', {
          defaultMessage: 'Host URL is required',
        }),
        index: idx,
      });
    } else if (!val.match(URL_REGEX)) {
      res.push({
        message: i18n.translate('xpack.fleet.settings.fleetServerHostsError', {
          defaultMessage: 'Invalid URL (must be an https URL)',
        }),
        index: idx,
      });
    }
    const curIndexes = hostIndexes[val] || [];
    hostIndexes[val] = [...curIndexes, idx];
  });

  Object.values(hostIndexes)
    .filter(({ length }) => length > 1)
    .forEach((indexes) => {
      indexes.forEach((index) =>
        res.push({
          message: i18n.translate('xpack.fleet.settings.fleetServerHostsDuplicateError', {
            defaultMessage: 'Duplicate URL',
          }),
          index,
        })
      );
    });

  if (res.length) {
    return res;
  }

  if (value.length && isDiffPathProtocol(value)) {
    return [
      {
        message: i18n.translate(
          'xpack.fleet.settings.fleetServerHostsDifferentPathOrProtocolError',
          {
            defaultMessage: 'Protocol and path must be the same for each URL',
          }
        ),
      },
    ];
  }
}

export function validateName(value: string) {
  if (!value || value === '') {
    return [
      i18n.translate('xpack.fleet.settings.fleetProxy.nameIsRequiredErrorMessage', {
        defaultMessage: 'Name is required',
      }),
    ];
  }
}

export function validateUrl(value: string) {
  if (!value || value === '') {
    return [
      i18n.translate('xpack.fleet.settings.fleetProxy.urlIsRequiredErrorMessage', {
        defaultMessage: 'Url is required',
      }),
    ];
  }
}

export function useFleetProxyForm(fleetProxy: FleetProxy | undefined, onSuccess: () => void) {
  const [isLoading, setIsLoading] = useState(false);
  const { notifications } = useStartServices();
  const { confirm } = useConfirmModal();
  const isPreconfigured = fleetProxy?.is_preconfigured ?? false;

  const nameInput = useInput(fleetProxy?.name ?? '', validateName, isPreconfigured);
  const urlInput = useInput(fleetProxy?.url ?? '', validateUrl, isPreconfigured);

  const validate = useCallback(
    () => nameInput.validate() && urlInput.validate(),
    [nameInput, urlInput]
  );

  const submit = useCallback(async () => {
    try {
      if (!validate()) {
        return;
      }
      if (fleetProxy && !(await confirm(<ConfirmTitle />, <ConfirmDescription />))) {
        return;
      }
      setIsLoading(true);
      if (fleetProxy) {
        const res = await sendPutFleetServerHost(fleetProxy.id, {
          name: nameInput.value,
          url: urlInput.value,
        });
        if (res.error) {
          throw res.error;
        }
      } else {
        const res = await sendPostFleetProxy({
          name: nameInput.value,
          url: urlInput.value,
        });
        if (res.error) {
          throw res.error;
        }
      }
      notifications.toasts.addSuccess(
        i18n.translate('xpack.fleet.settings.fleetProxyFlyout.successToastTitle', {
          defaultMessage: 'Fleet proxy saved',
        })
      );
      setIsLoading(false);
      await onSuccess();
    } catch (error) {
      setIsLoading(false);
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.fleet.settings.fleetProxyFlyout.errorToastTitle', {
          defaultMessage: 'An error happened while saving Fleet Server host',
        }),
      });
    }
  }, [fleetProxy, nameInput.value, urlInput.value, validate, notifications, confirm, onSuccess]);

  const isDisabled =
    isLoading ||
    (!nameInput.hasChanged && !urlInput.hasChanged) ||
    nameInput.props.isInvalid ||
    urlInput.props.isInvalid;

  return {
    isLoading,
    isDisabled,
    submit,
    inputs: {
      nameInput,
      urlInput,
    },
  };
}
