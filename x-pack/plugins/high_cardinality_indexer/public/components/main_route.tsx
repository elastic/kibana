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
import { useKibana } from '../hooks/use_kibana';
import {
  FAKE_HOSTS,
  FAKE_APM_LATENCY,
  FAKE_EC2,
  FAKE_K8S,
  FAKE_LOGS,
  FAKE_STACK,
} from '../../common/constants';

const DEFAULT_FORM_SETTINGS = {
  concurrency: 5,
  dataset: FAKE_LOGS,
  eventsPerCycle: 500,
  interval: 1000,
  payloadSize: 10000,
  reduceWeekendTrafficBy: 0,
  installAssets: false,
  scheduleTemplate: 'good',
  scheduleStart: 'now',
  scheduleEnd: 'false',
};

export function MainRoute() {
  const {
    observabilityShared,
    http,
    notifications: { toasts },
  } = useKibana().services;

  const ObservabilityPageTemplate = observabilityShared.navigation.PageTemplate;

  const [isLoading, setIsLoading] = useState(false);
  const [serverIsIndexing, setServerIsIndexing] = useState(false);

  const getJobStatus = useCallback(async () => {
    const { isRunning } = await http.get<{ isRunning: boolean }>(
      '/internal/high_cardinality_indexer/job/_status'
    );
    if (isRunning) {
      setServerIsIndexing(true);
      setIsLoading(true);
    }

    if (!isRunning) {
      setServerIsIndexing(false);
      setIsLoading(false);
    }
  }, [http]);

  useEffect(() => {
    getJobStatus();
  }, [getJobStatus]);

  useInterval(() => {
    getJobStatus();
  }, 15000);

  const [formData, setFormData] = useState(DEFAULT_FORM_SETTINGS);

  const handleChangeFormField = (
    value: string | number | boolean | undefined,
    id: keyof typeof DEFAULT_FORM_SETTINGS
  ) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const processForm = (unprocessedFormData: typeof DEFAULT_FORM_SETTINGS) => {
    const { scheduleStart, scheduleEnd, scheduleTemplate, ...rest } = unprocessedFormData;

    return {
      ...rest,
      concurrency: Number(formData.concurrency),
      eventsPerCycle: Number(formData.eventsPerCycle),
      interval: Number(formData.interval),
      payloadSize: Number(formData.payloadSize),
      reduceWeekendTrafficBy: Number(formData.reduceWeekendTrafficBy),
      schedule: [
        {
          template: formData.scheduleTemplate,
          start: formData.scheduleStart,
          end: formData.scheduleEnd,
        },
      ],
    };
  };

  const handleSubmitForm = () => {
    setIsLoading(true);
    setServerIsIndexing(true);

    const payload = processForm(formData);

    http
      .post('/internal/high_cardinality_indexer/job/_create', {
        body: JSON.stringify(payload),
      })
      .then(() => {
        setIsLoading(false);
        toasts.addSuccess('Successfully created job');
      })
      .catch((e) => {
        toasts.addError(e, { title: 'Something went wrong while creating job' });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleStopIndexing = async () => {
    const response = await http.get<{ success: boolean }>(
      '/internal/high_cardinality_indexer/job/_stop'
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
      <EuiCallOut
        title={i18n.translate('xpack.highCardinalityIndexer.callout.title', {
          defaultMessage: 'This is a development tool',
        })}
        iconType="gear"
        style={{ maxWidth: 800 }}
      >
        {i18n.translate('xpack.highCardinalityIndexer.callout.description', {
          defaultMessage:
            "This app is used to index fake data into your cluster to aid testing of use cases such as Alerting, Logs and Hosts. Only use this if you know what you're doing.",
        })}
      </EuiCallOut>

      <EuiSpacer size="xxl" />

      <EuiPanel style={{ maxWidth: 800 }} paddingSize="l">
        <EuiTitle size="m">
          <h2>
            {i18n.translate('xpack.highCardinalityIndexer.configureSettings', {
              defaultMessage: 'Configure settings',
            })}
          </h2>
        </EuiTitle>

        <EuiSpacer size="l" />

        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiForm component="form">
              <EuiFormRow
                label={i18n.translate('xpack.highCardinalityIndexer.form.dataset', {
                  defaultMessage: 'Dataset',
                })}
              >
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
                label={i18n.translate('xpack.highCardinalityIndexer.form.installAssets', {
                  defaultMessage: 'Install assets',
                })}
                disabled={isLoading || serverIsIndexing}
                checked={formData.installAssets}
                onChange={(e) => handleChangeFormField(e.target.checked, 'installAssets')}
              />
              <EuiSpacer size="xxl" />

              <EuiFormRow
                label={i18n.translate('xpack.highCardinalityIndexer.form.payloadSize', {
                  defaultMessage: 'Payload size',
                })}
              >
                <EuiFieldNumber
                  name="payloadSize"
                  disabled={isLoading || serverIsIndexing}
                  value={formData.payloadSize}
                  onChange={(e) => handleChangeFormField(e.currentTarget.value, 'payloadSize')}
                />
              </EuiFormRow>

              <EuiFormRow
                label={i18n.translate('xpack.highCardinalityIndexer.form.eventsPerCycle', {
                  defaultMessage: 'Events per cycle',
                })}
              >
                <EuiFieldNumber
                  name="eventsPerCycle"
                  disabled={isLoading || serverIsIndexing}
                  value={formData.eventsPerCycle}
                  onChange={(e) => handleChangeFormField(e.currentTarget.value, 'eventsPerCycle')}
                />
              </EuiFormRow>

              <EuiFormRow
                label={i18n.translate('xpack.highCardinalityIndexer.form.concurrency', {
                  defaultMessage: 'Concurrency',
                })}
              >
                <EuiFieldNumber
                  name="concurrency"
                  disabled={isLoading || serverIsIndexing}
                  value={formData.concurrency}
                  onChange={(e) => handleChangeFormField(e.currentTarget.value, 'concurrency')}
                />
              </EuiFormRow>
            </EuiForm>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiForm component="form">
              <EuiFormRow
                label={i18n.translate('xpack.highCardinalityIndexer.form.interval', {
                  defaultMessage: 'Interval (ms)',
                })}
              >
                <EuiFieldNumber
                  name="interval"
                  disabled={isLoading || serverIsIndexing}
                  value={formData.interval}
                  onChange={(e) => handleChangeFormField(e.currentTarget.value, 'interval')}
                />
              </EuiFormRow>

              <EuiFormRow
                label={i18n.translate('xpack.highCardinalityIndexer.form.reduceWeekendTrafficBy', {
                  defaultMessage: 'Reduce weekend traffic by',
                })}
              >
                <EuiFieldNumber
                  name="reduceWeekendTrafficBy"
                  value={formData.reduceWeekendTrafficBy}
                  onChange={(e) =>
                    handleChangeFormField(e.currentTarget.value, 'reduceWeekendTrafficBy')
                  }
                  disabled={isLoading || serverIsIndexing}
                />
              </EuiFormRow>

              <EuiFormRow
                label={i18n.translate('xpack.highCardinalityIndexer.form.scheduleTemplate', {
                  defaultMessage: 'Schedule template',
                })}
              >
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

              <EuiFormRow
                label={i18n.translate('xpack.highCardinalityIndexer.form.scheduleStart', {
                  defaultMessage: 'Schedule start',
                })}
              >
                <EuiSelect
                  onChange={(e) => handleChangeFormField(e.currentTarget.value, 'scheduleStart')}
                  options={[
                    {
                      value: 'now',
                      text: i18n.translate('xpack.highCardinalityIndexer.form.schedule.times.now', {
                        defaultMessage: 'Now',
                      }),
                    },
                    { value: '1m', text: '1 minute from now' },
                    { value: '2m', text: '2 minutes from now' },
                    { value: '5m', text: '5 minutes from now' },
                    { value: '10m', text: '10 minutes from now' },
                  ]}
                  value={formData.scheduleStart}
                  disabled={isLoading || serverIsIndexing}
                />
              </EuiFormRow>

              <EuiFormRow
                label={i18n.translate('xpack.highCardinalityIndexer.form.scheduleEnd', {
                  defaultMessage: 'Schedule end',
                })}
              >
                <EuiSelect
                  onChange={(e) => handleChangeFormField(e.currentTarget.value, 'scheduleEnd')}
                  options={[
                    {
                      value: 'false',
                      text: i18n.translate(
                        'xpack.highCardinalityIndexer.form.schedule.times.indefinitely',
                        {
                          defaultMessage: 'Indefinitely',
                        }
                      ),
                    },
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
              {serverIsIndexing
                ? i18n.translate('xpack.highCardinalityIndexer.form.indexingInProgress', {
                    defaultMessage: 'Indexing...',
                  })
                : i18n.translate('xpack.highCardinalityIndexer.form.startIndexing', {
                    defaultMessage: 'Start indexing fake data',
                  })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton
              fill
              disabled={!serverIsIndexing}
              onClick={handleStopIndexing}
              color="danger"
            >
              {i18n.translate('xpack.highCardinalityIndexer.form.stop', {
                defaultMessage: 'Stop',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <EuiSpacer size="l" />
    </ObservabilityPageTemplate>
  );
}
