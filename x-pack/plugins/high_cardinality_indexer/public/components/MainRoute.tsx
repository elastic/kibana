/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import useInterval from 'react-use/lib/useInterval';
import {
  EuiButton,
  EuiCallOut,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiPanel,
  EuiProgress,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { QueueObject } from 'async';
import type { Doc } from '../../common/types';
import { useKibana } from '../hooks/use_kibana';
import {
  FAKE_HOSTS,
  FAKE_APM_LATENCY,
  FAKE_EC2,
  FAKE_K8S,
  FAKE_LOGS,
  FAKE_STACK,
} from '../../common/constants';

export function MainRoute() {
  const {
    observabilityShared,
    http,
    notifications: { toasts },
  } = useKibana().services;

  const ObservabilityPageTemplate = observabilityShared.navigation.PageTemplate;

  const [isLoading, setIsLoading] = useState(false);
  const [serverIsIndexing, setServerIsIndexing] = useState(false);

  const getStatus = useCallback(async () => {
    const queues = await http.get<Array<QueueObject<Doc>>>(
      '/internal/high_cardinality_indexer/queue/_status'
    );
    if (queues.length > 0 && !serverIsIndexing) {
      setServerIsIndexing(true);
      setIsLoading(true);
    }

    if (queues.length === 0 && serverIsIndexing && !isLoading) {
      setServerIsIndexing(false);
      setIsLoading(false);
    }
  }, [http, isLoading, serverIsIndexing]);

  useInterval(() => {
    getStatus();
  }, 10000);

  useEffect(() => {
    getStatus();
  }, [getStatus]);

  const defaultFormData = {
    concurrency: 5,
    dataset: FAKE_LOGS,
    eventsPerCycle: 10000,
    interval: 6000,
    payloadSize: 10000,
    reduceWeekendTrafficBy: 0,
    installAssets: false,
    scheduleTemplate: 'good',
    scheduleStart: 'now',
    scheduleEnd: 'false',
  };

  const [formData, setFormData] = useState(defaultFormData);

  const handleChangeFormField = (
    value: string | number | boolean | undefined,
    id: keyof typeof defaultFormData
  ) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmitForm = () => {
    setIsLoading(true);
    setServerIsIndexing(true);

    const { scheduleStart, scheduleEnd, scheduleTemplate, ...rest } = formData;

    const payload = {
      ...rest,
      schedule: [
        {
          template: formData.scheduleTemplate,
          start: formData.scheduleStart,
          end: formData.scheduleEnd,
        },
      ],
    };

    http
      .post('/internal/high_cardinality_indexer/_create', {
        body: JSON.stringify(payload),
      })
      .then(() => {
        setIsLoading(false);
        toasts.addSuccess('Successfully completed indexing');
      })
      .catch((e) => {
        toasts.addError(e, { title: 'Something went wrong while indexing' });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleStopIndexing = async () => {
    const response = await http.get<{ success: boolean }>(
      '/internal/high_cardinality_indexer/queue/_stop'
    );

    if (response.success) {
      setServerIsIndexing(false);
      setIsLoading(false);
    }
  };

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: i18n.translate('xpack.highCardinalityIndexer.mainRoute.title', {
          defaultMessage: 'High Cardinality Indexer',
        }),
        bottomBorder: false,
        children: (
          <EuiProgress
            size="xs"
            color="accent"
            max={serverIsIndexing || isLoading ? undefined : 1}
          />
        ),
      }}
    >
      <EuiCallOut title="This is a development tool" iconType="gear" style={{ maxWidth: 800 }}>
        This app is used to index fake data into your cluster to aid testing of various use cases
        such as Alerting, Logs and Hosts.
      </EuiCallOut>

      <EuiSpacer size="xxl" />

      <EuiPanel style={{ maxWidth: 800 }} paddingSize="l">
        <EuiTitle size="m">
          <h2>Configure settings</h2>
        </EuiTitle>

        <EuiSpacer size="l" />

        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiForm component="form">
              <EuiFormRow label="Dataset">
                <EuiSelect
                  hasNoInitialSelection
                  disabled={isLoading || serverIsIndexing}
                  options={[
                    { value: FAKE_HOSTS, text: FAKE_HOSTS },
                    { value: FAKE_APM_LATENCY, text: FAKE_APM_LATENCY },
                    { value: FAKE_EC2, text: FAKE_EC2 },
                    { value: FAKE_K8S, text: FAKE_K8S },
                    { value: FAKE_LOGS, text: FAKE_LOGS },
                    { value: FAKE_STACK, text: FAKE_STACK },
                  ]}
                  value={formData.dataset}
                  onChange={(e) => handleChangeFormField(e.currentTarget.value, 'dataset')}
                />
              </EuiFormRow>

              <EuiSpacer size="m" />

              <EuiSwitch
                label="Install assets"
                disabled={isLoading || serverIsIndexing}
                checked={formData.installAssets}
                onChange={(e) => handleChangeFormField(e.target.checked, 'installAssets')}
              />
              <EuiSpacer size="xxl" />

              <EuiFormRow label="Events per cycle">
                <EuiFieldNumber
                  name="eventsPerCycle"
                  disabled={isLoading || serverIsIndexing}
                  value={formData.eventsPerCycle}
                  onChange={(e) =>
                    handleChangeFormField(Number(e.currentTarget.value), 'eventsPerCycle')
                  }
                />
              </EuiFormRow>

              <EuiFormRow label="Payload size">
                <EuiFieldNumber
                  name="payloadSize"
                  disabled={isLoading || serverIsIndexing}
                  value={formData.payloadSize}
                  onChange={(e) =>
                    handleChangeFormField(Number(e.currentTarget.value), 'payloadSize')
                  }
                />
              </EuiFormRow>

              <EuiFormRow label="Concurrency">
                <EuiFieldNumber
                  name="concurrency"
                  disabled={isLoading || serverIsIndexing}
                  value={formData.concurrency}
                  onChange={(e) =>
                    handleChangeFormField(Number(e.currentTarget.value), 'concurrency')
                  }
                />
              </EuiFormRow>
            </EuiForm>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiForm component="form">
              <EuiFormRow label="Index interval">
                <EuiFieldNumber
                  name="interval"
                  disabled={isLoading || serverIsIndexing}
                  value={formData.interval}
                  onChange={(e) => handleChangeFormField(Number(e.currentTarget.value), 'interval')}
                />
              </EuiFormRow>

              <EuiFormRow label="Reduce weekend traffic by">
                <EuiFieldNumber
                  name="reduceWeekendTrafficBy"
                  value={formData.reduceWeekendTrafficBy}
                  onChange={(e) =>
                    handleChangeFormField(e.currentTarget.value, 'reduceWeekendTrafficBy')
                  }
                  disabled={isLoading || serverIsIndexing}
                />
              </EuiFormRow>

              <EuiFormRow label="Schedule template">
                <EuiSelect
                  hasNoInitialSelection
                  onChange={(e) => handleChangeFormField(e.currentTarget.value, 'scheduleTemplate')}
                  options={[
                    { value: 'good', text: 'good' },
                    { value: 'bad', text: 'bad' },
                  ]}
                  value={formData.scheduleTemplate}
                  disabled={isLoading || serverIsIndexing}
                />
              </EuiFormRow>

              <EuiFormRow label="Schedule start">
                <EuiSelect
                  onChange={(e) => handleChangeFormField(e.currentTarget.value, 'scheduleStart')}
                  options={[
                    { value: 'now', text: 'Now' },
                    { value: '1m', text: '1 minute from now' },
                    { value: '2m', text: '2 minutes from now' },
                    { value: '5m', text: '5 minutes from now' },
                    { value: '10m', text: '10 minutes from now' },
                  ]}
                  value={formData.scheduleStart}
                  disabled={isLoading || serverIsIndexing}
                />
              </EuiFormRow>

              <EuiFormRow label="Schedule end">
                <EuiSelect
                  onChange={(e) => handleChangeFormField(e.currentTarget.value, 'scheduleEnd')}
                  options={[
                    { value: 'false', text: 'Indefinitely' },
                    { value: '1m', text: '1 minute from now' },
                    { value: '2m', text: '2 minutes from now' },
                    { value: '5m', text: '5 minutes from now' },
                    { value: '10m', text: '10 minutes from now' },
                  ]}
                  value={formData.scheduleEnd}
                  disabled={isLoading || serverIsIndexing}
                />
              </EuiFormRow>
            </EuiForm>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiHorizontalRule />

        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiButton fill isLoading={isLoading || serverIsIndexing} onClick={handleSubmitForm}>
              {serverIsIndexing ? 'Indexing...' : 'Start indexing'}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton
              fill
              disabled={!serverIsIndexing}
              onClick={handleStopIndexing}
              color="danger"
            >
              Stop
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <EuiSpacer size="l" />
    </ObservabilityPageTemplate>
  );
}
