/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { toastNotifications } from 'ui/notify';
import {
  EuiSelect,
  EuiForm,
  EuiFormRow,
  EuiButton,
  EuiFieldNumber
} from '@elastic/eui';
import { isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  loadCMServices,
  loadCMEnvironments,
  saveCMConfiguration
} from '../../../../services/rest/apm/settings';
import { useFetcher } from '../../../../hooks/useFetcher';

const ENVIRONMENT_NOT_SET = 'ENVIRONMENT_NOT_SET';

export function AddSetting() {
  const [environment, setEnvironment] = useState<string | undefined>(undefined);
  const [serviceName, setServiceName] = useState<string | undefined>(undefined);
  const [sampleRate, setSampleRate] = useState<number | undefined>(undefined);
  const { data: serviceNames = [], status: serviceNamesStatus } = useFetcher(
    loadCMServices,
    [],
    { preservePreviousResponse: false }
  );
  const { data: environments = [], status: environmentStatus } = useFetcher(
    () => {
      if (serviceName) {
        return loadCMEnvironments({ serviceName });
      }
    },
    [serviceName],
    { preservePreviousResponse: false }
  );

  useEffect(
    () => {
      if (!isEmpty(environments)) {
        setEnvironment(environments[0].name);
      }
    },
    [environments]
  );

  useEffect(
    () => {
      if (!isEmpty(serviceNames)) {
        setServiceName(serviceNames[0]);
      }
    },
    [serviceNames]
  );

  const environmentOptions = environments.map(({ name, available }) => ({
    disabled: !available,
    text: name === ENVIRONMENT_NOT_SET ? 'Not set' : name,
    value: name
  }));

  const isSelectedEnvironmentValid = environments.some(
    env => env.name === environment && env.available
  );

  return (
    <EuiForm>
      <form
        onSubmit={async event => {
          event.preventDefault();

          try {
            if (!sampleRate || !serviceName) {
              throw new Error('Missing arguments');
            }

            const configuration = {
              settings: {
                sample_rate: sampleRate
              },
              service: {
                name: serviceName,
                environment:
                  environment === ENVIRONMENT_NOT_SET ? undefined : environment
              }
            };

            await saveCMConfiguration(configuration);

            toastNotifications.addSuccess({
              title: i18n.translate(
                'xpack.apm.settings.cm.createConfigSucceeded',
                { defaultMessage: 'Config was created' }
              )
            });
          } catch (error) {
            toastNotifications.addDanger({
              title: i18n.translate(
                'xpack.apm.settings.cm.createConfigFailed',
                { defaultMessage: 'Config could not be created' }
              )
            });
          }
        }}
      >
        <EuiFormRow label="Service name">
          <EuiSelect
            isLoading={serviceNamesStatus === 'loading'}
            options={serviceNames.map(text => ({ text }))}
            value={serviceName}
            onChange={e => {
              e.preventDefault();
              setServiceName(e.target.value);
            }}
          />
        </EuiFormRow>

        <EuiFormRow
          label="Service environment"
          error={
            'The selected environment is not allowed, because a configuration for the selected service name and environment already exists'
          }
          isInvalid={
            !isSelectedEnvironmentValid &&
            (environmentStatus === 'success' || environmentStatus === 'failure')
          }
        >
          <EuiSelect
            isLoading={environmentStatus === 'loading'}
            options={environmentOptions}
            value={environment}
            onChange={e => {
              e.preventDefault();
              setEnvironment(e.target.value);
            }}
          />
        </EuiFormRow>

        <EuiFormRow label="Transaction sample rate">
          <EuiFieldNumber
            min={0}
            max={1}
            step={0.1}
            placeholder="Sample rate... (E.g. 0.2)"
            value={sampleRate}
            onChange={e => {
              e.preventDefault();
              const parsedValue = parseFloat(e.target.value);

              setSampleRate(isNaN(parsedValue) ? undefined : parsedValue);
            }}
          />
        </EuiFormRow>

        <EuiFormRow label="&nbsp;">
          <EuiButton
            type="submit"
            fill
            disabled={
              serviceName == null ||
              sampleRate == null ||
              environment == null ||
              !isSelectedEnvironmentValid
            }
          >
            Save configuration
          </EuiButton>
        </EuiFormRow>

        {/* <p>serviceName: {serviceName}</p>
        <p>sampleRate: {sampleRate}</p>
        <p>env: {environment}</p> */}
      </form>
    </EuiForm>
  );
}
