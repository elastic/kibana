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
  EuiFlexItem,
  EuiFieldNumber,
  EuiTitle
} from '@elastic/eui';
import { isEmpty } from 'lodash';
import { EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  loadCMServices,
  loadCMEnvironments,
  saveCMConfiguration
} from '../../../../services/rest/apm/settings';
import { useFetcher } from '../../../../hooks/useFetcher';
import { history } from '../../../../utils/history';

const ENVIRONMENT_NOT_SET = 'ENVIRONMENT_NOT_SET';

export function AddSetting() {
  const [environment, setEnvironment] = useState<string | undefined>(undefined);
  const [serviceName, setServiceName] = useState<string | undefined>(undefined);
  const [sampleRate, setSampleRate] = useState<number | undefined>(undefined);
  const { data: serviceNames = [] } = useFetcher(loadCMServices, []);
  const { data: environments = [], status: environmentStatus } = useFetcher(
    () => {
      if (serviceName) {
        return loadCMEnvironments({ serviceName });
      }
    },
    [serviceName]
  );

  useEffect(
    () => {
      if (!isEmpty(environments)) {
        setEnvironment(undefined);
      }
    },
    [environments]
  );

  useEffect(
    () => {
      if (!isEmpty(serviceNames)) {
        setServiceName(undefined);
      }
    },
    [serviceNames]
  );

  const hasAnyAvailableEnvironments = environments.some(env => env.available);
  const environmentOptions = environments.map(({ name, available }) => ({
    disabled: !available,
    text: name === ENVIRONMENT_NOT_SET ? 'Not set' : name,
    value: name
  }));

  return (
    <EuiForm>
      <EuiTitle>
        <h2>Agent configuration</h2>
      </EuiTitle>
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
            history.push({
              ...history.location,
              pathname: `/settings`
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
        <EuiFlexGroup justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <EuiFormRow label="Service name">
              <EuiSelect
                hasNoInitialSelection
                options={serviceNames.map(text => ({ text }))}
                value={serviceName}
                onChange={e => {
                  setServiceName(e.target.value);
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow
              label="Service environment"
              error={
                'You have created configurations for all environments in this service'
              }
              isInvalid={
                !hasAnyAvailableEnvironments &&
                (environmentStatus === 'success' ||
                  environmentStatus === 'failure')
              }
            >
              <EuiSelect
                hasNoInitialSelection
                options={environmentOptions}
                value={environment}
                onChange={e => {
                  setEnvironment(e.target.value);
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow label="Transaction sample rate">
              <EuiFieldNumber
                min={0}
                max={1}
                step={0.1}
                placeholder="0.2"
                value={sampleRate}
                onChange={e => {
                  const parsedValue = parseFloat(e.target.value);
                  setSampleRate(parsedValue);
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow label="&nbsp;">
              <EuiButton
                type="submit"
                fill
                disabled={!hasAnyAvailableEnvironments}
              >
                Save configuration
              </EuiButton>
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>

        {/* <p>serviceName: {serviceName}</p>
        <p>sampleRate: {sampleRate}</p>
        <p>env: {environment}</p> */}
      </form>
    </EuiForm>
  );
}
