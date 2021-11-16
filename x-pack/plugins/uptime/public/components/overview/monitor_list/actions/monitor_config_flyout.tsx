/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { apiService } from '../../../../state/api/utils';
import { API_URLS } from '../../../../../common/constants';
import { MonitorSavedObject } from '../../../../../common/types';
import { TestRunResult } from './TestRunResult';
import { MonitorConfigFlyoutBody } from './monitor_config_flyout_body';

import { DataStream, PolicyConfig } from '../../../fleet_package/types';
import { defaultConfig, usePolicyConfigContext } from '../../../fleet_package/contexts';

import { usePolicy } from '../../../fleet_package/hooks/use_policy';
import { validate } from '../../../fleet_package/validation';
import { useUpdateMonitor } from './use_update_monitor';
import { useSaveMonitor } from './use_save_monitor';

export const uptimeMonitorType = 'uptime-monitor';

interface Props {
  monitor: MonitorSavedObject;
  isEditFlow?: boolean;
  setIsFlyoutVisible: (val: boolean) => void;
}
const getBrowserMonitor = (monitor: MonitorSavedObject, policy: PolicyConfig) => {
  if (!monitor) {
    return policy;
  }
  policy[DataStream.BROWSER]['source.inline.script'] = monitor.attributes.source?.inline.script;
  policy[DataStream.BROWSER]['source.inline.scriptActions'] =
    monitor.attributes['source.inline.scriptActions'];

  return policy;
};

export const MonitorConfigFlyout = ({ setIsFlyoutVisible, monitor, isEditFlow = false }: Props) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isTestRunning, setTestRunning] = useState(false);
  const [testMonitor, setTestMonitor] = useState<MonitorSavedObject>();
  const { monitorType } = usePolicyConfigContext();
  const [name, setName] = useState(monitor?.attributes.name ?? '');
  const policyConfig: PolicyConfig = usePolicy(name);
  const [locations, setLocations] = useState<string[]>([]);
  const { updatedMonitor, isValid } = useUpdateMonitor({
    monitorType,
    validate,
    // config: { ...policyConfig[monitorType], name },
    config: { ...getBrowserMonitor(monitor, policyConfig)[monitorType], name },
    defaultConfig: defaultConfig[monitorType],
  });

  const { onSave } = useSaveMonitor({ isEditFlow, setTestMonitor });

  /* install index templates, this will need to be moved to it's own component and happen
   * on explicit user input to enable the synthetics service */
  useEffect(() => {
    async function installIndexTemplates() {
      try {
        await apiService.post(API_URLS.INDEX_TEMPLATES);
      } catch (e) {
        console.error(e);
      }
    }
    installIndexTemplates();
  }, []);

  const saveMonitor = async () => {
    if (isValid) {
      setIsSaving(true);
      await onSave({ updatedMonitor, name });
      setIsFlyoutVisible(false);
    } else {
      // error state
    }
  };

  const closeModal = async () => {
    setIsFlyoutVisible(false);
  };

  const onTestRun = () => {
    if (isValid) {
      setTestRunning(true);
      onSave({ updatedMonitor, name, testRun: true });
    } else {
      // error state
    }
  };

  return (
    <EuiFlyout onClose={closeModal} ownFocus style={{ width: 600 }} size="xl">
      <EuiFlyoutHeader>
        <EuiModalHeaderTitle>
          <h2>{isEditFlow ? 'Edit monitor' : 'Add monitor'}</h2>
        </EuiModalHeaderTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <MonitorConfigFlyoutBody
          locations={locations}
          setLocations={setLocations}
          setName={setName}
          name={name}
          monitor={monitor}
        />
        <EuiHorizontalRule margin="xs" style={{ height: 2 }} />
      </EuiFlyoutBody>
      {testMonitor && (
        <TestRunResult monitorId={testMonitor?.id + '-inline'} monitor={testMonitor} />
      )}
      <EuiFlyoutFooter>
        <EuiFlexGroup>
          <EuiFlexItem grow={true}>
            <EuiButtonEmpty onClick={closeModal} style={{ width: 100 }}>
              Cancel
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onTestRun}>
              {testMonitor ? 'Update test run' : 'Test run'}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={saveMonitor} fill isLoading={isSaving}>
              {monitor?.id ? 'Update' : 'Save'}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
