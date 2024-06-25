/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState, useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { safeDump, safeLoad } from 'js-yaml';

import {
  sendPostFleetProxy,
  sendPutFleetProxy,
  useAuthz,
  useInput,
  useStartServices,
  validateInputs,
} from '../../../../hooks';

import { useConfirmModal } from '../../hooks/use_confirm_modal';
import type { FleetProxy } from '../../../../types';
import { PROXY_URL_REGEX } from '../../../../../../../common/constants';

const ConfirmTitle = () => (
  <FormattedMessage
    id="xpack.fleet.settings.fleetProxyFlyout.confirmModalTitle"
    defaultMessage="Save and deploy changes?"
  />
);

const ConfirmDescription: React.FunctionComponent = ({}) => (
  <FormattedMessage
    id="xpack.fleet.settings.fleetProxyFlyout.confirmModalText"
    defaultMessage="This action will update agent policies using that proxies. This action can not be undone. Are you sure you wish to continue?"
  />
);

function validateUrl(value: string) {
  if (!value || value === '') {
    return [
      i18n.translate('xpack.fleet.settings.fleetProxyFlyoutUrlRequired', {
        defaultMessage: 'URL is required',
      }),
    ];
  }

  if (!value.match(PROXY_URL_REGEX)) {
    return [
      i18n.translate('xpack.fleet.settings.fleetProxyFlyoutUrlError', {
        defaultMessage: 'Invalid URL',
      }),
    ];
  }
}

function validateProxyHeaders(value: string) {
  if (value && value !== '') {
    const res = safeLoad(value);
    if (
      typeof res !== 'object' ||
      Object.values(res).some((val) => {
        const valType = typeof val;
        return valType !== 'string' && valType !== 'number' && valType !== 'boolean';
      })
    ) {
      return [
        i18n.translate('xpack.fleet.settings.fleetProxy.proxyHeadersErrorMessage', {
          defaultMessage: 'Proxy headers is not a valid key: value object.',
        }),
      ];
    }
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

export function useFleetProxyForm(fleetProxy: FleetProxy | undefined, onSuccess: () => void) {
  const [isLoading, setIsLoading] = useState(false);
  const authz = useAuthz();
  const { notifications } = useStartServices();
  const { confirm } = useConfirmModal();
  const isEditDisabled = (!authz.fleet.allSettings || fleetProxy?.is_preconfigured) ?? false;

  const nameInput = useInput(fleetProxy?.name ?? '', validateName, isEditDisabled);
  const urlInput = useInput(fleetProxy?.url ?? '', validateUrl, isEditDisabled);
  const proxyHeadersInput = useInput(
    fleetProxy?.proxy_headers ? safeDump(fleetProxy.proxy_headers) : '',
    validateProxyHeaders,
    isEditDisabled
  );
  const certificateAuthoritiesInput = useInput(
    fleetProxy?.certificate_authorities ?? '',
    () => undefined,
    isEditDisabled
  );
  const certificateInput = useInput(fleetProxy?.certificate ?? '', () => undefined, isEditDisabled);
  const certificateKeyInput = useInput(
    fleetProxy?.certificate_key ?? '',
    () => undefined,
    isEditDisabled
  );

  const inputs = useMemo(
    () => ({
      nameInput,
      urlInput,
      proxyHeadersInput,
      certificateAuthoritiesInput,
      certificateInput,
      certificateKeyInput,
    }),
    [
      nameInput,
      urlInput,
      proxyHeadersInput,
      certificateAuthoritiesInput,
      certificateInput,
      certificateKeyInput,
    ]
  );

  const validate = useCallback(() => validateInputs(inputs), [inputs]);

  const submit = useCallback(async () => {
    try {
      if (!validate()) {
        return;
      }
      if (fleetProxy && !(await confirm(<ConfirmTitle />, <ConfirmDescription />))) {
        return;
      }
      setIsLoading(true);
      const data = {
        name: nameInput.value,
        url: urlInput.value,
        proxy_headers:
          proxyHeadersInput.value === '' ? undefined : safeLoad(proxyHeadersInput.value),
        certificate_authorities: certificateAuthoritiesInput.value,
        certificate: certificateInput.value,
        certificate_key: certificateKeyInput.value,
      };
      if (fleetProxy) {
        const res = await sendPutFleetProxy(fleetProxy.id, data);
        if (res.error) {
          throw res.error;
        }
      } else {
        const res = await sendPostFleetProxy(data);
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
  }, [
    fleetProxy,
    nameInput.value,
    urlInput.value,
    proxyHeadersInput.value,
    certificateAuthoritiesInput.value,
    certificateInput.value,
    certificateKeyInput.value,
    validate,
    notifications,
    confirm,
    onSuccess,
  ]);

  const hasChanged = Object.values(inputs).some((input) => input.hasChanged);

  const isDisabled =
    isLoading || !hasChanged || nameInput.props.isInvalid || urlInput.props.isInvalid;

  return {
    isLoading,
    isDisabled,
    submit,
    inputs,
  };
}
