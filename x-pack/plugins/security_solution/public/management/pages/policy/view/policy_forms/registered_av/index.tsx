/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { EuiSwitch } from '@elastic/eui';

import { ConfigForm } from '../config_form';
import { isRegisteredAV } from '../../../store/policy_details/selectors';
import { usePolicyDetailsSelector } from '../../policy_hooks';

export const RegisteredAV = memo(() => {
  const registeredAV = usePolicyDetailsSelector(isRegisteredAV);
  const dispatch = useDispatch();

  const handleSwitchChange = useCallback(
    (event) =>
      dispatch({
        type: 'userChangedRegisteredAV',
        payload: {
          registeredAV: event.target.checked,
        },
      }),
    [dispatch]
  );

  return (
    <ConfigForm
      type={i18n.translate('xpack.securitySolution.endpoint.policy.details.registeredAV', {
        defaultMessage: 'Registered AV',
      })}
      supportedOss={['windows']}
    >
      <EuiSwitch
        label={i18n.translate(
          'xpack.securitySolution.endpoint.policy.details.registeredAVEnabled',
          {
            defaultMessage: '{selected, select, true {Registered} false {Not Registered}}',
            values: {
              selected: registeredAV,
            },
          }
        )}
        checked={registeredAV}
        onChange={handleSwitchChange}
      />
    </ConfigForm>
  );
});

RegisteredAV.displayName = 'MalwareProtections';
