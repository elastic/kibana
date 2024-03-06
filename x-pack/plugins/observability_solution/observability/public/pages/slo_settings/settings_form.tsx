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
} from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { isEqual } from 'lodash';
import type { SloSettings } from '../../../server/domain/models';
import { usePutSloSettings } from './use_put_slo_settings';

export function SettingsForm() {
  const [useAllRemoteClusters, setUseAllRemoteClusters] = useState(false);
  const [selectedRemoteClusters, setSelectedRemoteClusters] = useState<string[]>([]);

  const { http } = useKibana().services;

  const { mutateAsync: updateSettings } = usePutSloSettings();

  const { data } = useFetcher(() => {
    return http?.get<Array<{ name: string }>>('/api/remote_clusters');
  }, [http]);

  const { data: currentSettings } = useFetcher(() => {
    return http?.get<SloSettings>('/internal/observability/slo/settings');
  }, [http]);

  useEffect(() => {
    if (currentSettings) {
      setUseAllRemoteClusters(currentSettings.useAllRemoteClusters);
      setSelectedRemoteClusters(currentSettings.selectedRemoteClusters);
    }
  }, [currentSettings]);

  const onSubmit = async () => {
    updateSettings({
      settings: {
        useAllRemoteClusters,
        selectedRemoteClusters,
      },
    });
  };

  return (
    <EuiForm component="form">
      <EuiDescribedFormGroup
        title={
          <h3>
            {i18n.translate('xpack.observability.settingsForm.h3.sourceSettingsLabel', {
              defaultMessage: 'Source settings',
            })}
          </h3>
        }
        description={
          <p>
            {i18n.translate('xpack.observability.settingsForm.p.fetchSlosFromAllLabel', {
              defaultMessage: 'Fetch Slos from all remote clusters.',
            })}
          </p>
        }
      >
        <EuiFormRow
          label={i18n.translate(
            'xpack.observability.settingsForm.euiFormRow.useAllRemoteClustersLabel',
            { defaultMessage: 'Use all remote clusters' }
          )}
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
            {i18n.translate('xpack.observability.settingsForm.h3.sourceSettingsLabel', {
              defaultMessage: 'Remote clusters',
            })}
          </h3>
        }
        description={
          <p>
            {i18n.translate('xpack.observability.settingsForm.p.fetchSlosFromAllLabel', {
              defaultMessage: 'Select remote clusters to fetch SLOs from.',
            })}
          </p>
        }
      >
        <EuiFormRow
          label={i18n.translate(
            'xpack.observability.settingsForm.euiFormRow.selectRemoteClustersLabel',
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
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="o11ySettingsFormCancelButton"
              onClick={() => {
                setUseAllRemoteClusters(currentSettings?.useAllRemoteClusters || false);
                setSelectedRemoteClusters(currentSettings?.selectedRemoteClusters || []);
              }}
              isDisabled={isEqual(currentSettings, {
                useAllRemoteClusters,
                selectedRemoteClusters,
              })}
            >
              {i18n.translate('xpack.observability.settingsForm.euiButtonEmpty.cancelLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="o11ySettingsFormSaveButton"
              color="primary"
              fill
              onClick={() => onSubmit()}
              isDisabled={isEqual(currentSettings, {
                useAllRemoteClusters,
                selectedRemoteClusters,
              })}
            >
              {i18n.translate('xpack.observability.settingsForm.applyButtonEmptyLabel', {
                defaultMessage: 'Apply',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiDescribedFormGroup>
    </EuiForm>
  );
}
