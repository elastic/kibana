/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import {
  EuiForm,
  EuiFormRow,
  EuiSwitch,
  EuiDescribedFormGroup,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiSpacer,
  EuiFieldNumber,
} from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { isEqual } from 'lodash';
import { DEFAULT_STALE_SLO_THRESHOLD_HOURS } from '../../../common/constants';
import { useGetSettings } from './use_get_settings';
import { usePutSloSettings } from './use_put_slo_settings';

export function SettingsForm() {
  const [useAllRemoteClusters, setUseAllRemoteClusters] = useState(false);
  const [selectedRemoteClusters, setSelectedRemoteClusters] = useState<string[]>([]);
  const [staleThresholdInHours, setStaleThresholdInHours] = useState(
    DEFAULT_STALE_SLO_THRESHOLD_HOURS
  );

  const { http } = useKibana().services;

  const { data: currentSettings } = useGetSettings();
  const { mutateAsync: updateSettings, isLoading: isUpdating } = usePutSloSettings();

  const { data, loading } = useFetcher(() => {
    return http?.get<Array<{ name: string }>>('/api/remote_clusters');
  }, [http]);

  useEffect(() => {
    if (currentSettings) {
      setUseAllRemoteClusters(currentSettings.useAllRemoteClusters);
      setSelectedRemoteClusters(currentSettings.selectedRemoteClusters);
      setStaleThresholdInHours(currentSettings.staleThresholdInHours);
    }
  }, [currentSettings]);

  const onSubmit = async () => {
    updateSettings({
      settings: {
        useAllRemoteClusters,
        selectedRemoteClusters,
        staleThresholdInHours,
      },
    });
  };

  return (
    <EuiForm component="form">
      <EuiDescribedFormGroup
        title={
          <h3>
            {i18n.translate('xpack.slo.settingsForm.h3.sourceSettingsLabel', {
              defaultMessage: 'Source settings',
            })}
          </h3>
        }
        description={
          <p>
            {i18n.translate('xpack.slo.settingsForm.p.fetchSlosFromAllLabel', {
              defaultMessage: 'Fetch SLOs from all remote clusters.',
            })}
          </p>
        }
      >
        <EuiFormRow
          label={i18n.translate('xpack.slo.settingsForm.euiFormRow.useAllRemoteClustersLabel', {
            defaultMessage: 'Use all remote clusters',
          })}
        >
          <EuiSwitch
            label=""
            checked={useAllRemoteClusters}
            onChange={(evt) => setUseAllRemoteClusters(evt.target.checked)}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <EuiDescribedFormGroup
        title={
          <h3>
            {i18n.translate('xpack.slo.settingsForm.h3.remoteSettingsLabel', {
              defaultMessage: 'Remote clusters',
            })}
          </h3>
        }
        description={
          <p>
            {i18n.translate('xpack.slo.settingsForm.select.fetchSlosFromAllLabel', {
              defaultMessage: 'Select remote clusters to fetch SLOs from.',
            })}
          </p>
        }
      >
        <EuiFormRow
          label={i18n.translate(
            'xpack.slo.settingsForm.euiFormRow.select.selectRemoteClustersLabel',
            { defaultMessage: 'Select remote clusters' }
          )}
        >
          <EuiComboBox
            options={data?.map((cluster) => ({ label: cluster.name, value: cluster.name })) || []}
            selectedOptions={selectedRemoteClusters.map((cluster) => ({
              label: cluster,
              value: cluster,
            }))}
            onChange={(sels) => {
              setSelectedRemoteClusters(sels.map((s) => s.value as string));
            }}
            isDisabled={useAllRemoteClusters}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
      </EuiDescribedFormGroup>
      <EuiDescribedFormGroup
        title={
          <h3>
            {i18n.translate('xpack.slo.settingsForm.h3.staleThresholdLabel', {
              defaultMessage: 'Stale SLOs threshold',
            })}
          </h3>
        }
        description={
          <p>
            {i18n.translate('xpack.slo.settingsForm.select.staleThresholdLabel', {
              defaultMessage:
                'SLOs not updated within the defined stale threshold will be hidden by default from the overview list.',
            })}
          </p>
        }
      >
        <EuiFormRow
          label={i18n.translate('xpack.slo.settingsForm.euiFormRow.select.selectThresholdLabel', {
            defaultMessage: 'Select threshold',
          })}
        >
          <EuiFieldNumber
            data-test-subj="sloSettingsFormFieldNumber"
            value={staleThresholdInHours}
            onChange={(evt) => {
              setStaleThresholdInHours(Number(evt.target.value));
            }}
            append={i18n.translate('xpack.slo.settingsForm.euiFormRow.select.hours', {
              defaultMessage: 'Hours',
            })}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              isLoading={loading || isUpdating}
              data-test-subj="o11ySettingsFormCancelButton"
              onClick={() => {
                setUseAllRemoteClusters(currentSettings?.useAllRemoteClusters || false);
                setSelectedRemoteClusters(currentSettings?.selectedRemoteClusters || []);
                setStaleThresholdInHours(
                  currentSettings?.staleThresholdInHours ?? DEFAULT_STALE_SLO_THRESHOLD_HOURS
                );
              }}
              isDisabled={isEqual(currentSettings, {
                useAllRemoteClusters,
                selectedRemoteClusters,
                staleThresholdInHours,
              })}
            >
              {i18n.translate('xpack.slo.settingsForm.euiButtonEmpty.cancelLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              isLoading={loading || isUpdating}
              data-test-subj="o11ySettingsFormSaveButton"
              color="primary"
              fill
              onClick={() => onSubmit()}
              isDisabled={isEqual(currentSettings, {
                useAllRemoteClusters,
                selectedRemoteClusters,
                staleThresholdInHours,
              })}
            >
              {i18n.translate('xpack.slo.settingsForm.applyButtonEmptyLabel', {
                defaultMessage: 'Apply',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiDescribedFormGroup>
    </EuiForm>
  );
}
