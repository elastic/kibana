/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useContext } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiModalHeaderTitle,
  EuiHorizontalRule,
} from '@elastic/eui';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { apiService } from '../../../../state/api/utils';
import { API_URLS } from '../../../../../common/constants';
import { UptimeRefreshContext } from '../../../../contexts';
import { MonitorSavedObject } from '../../../../../common/types';
import { TestRunResult } from './TestRunResult';
import { MonitorConfigFlyoutBody } from './monitor_config_flyout_body';

import { PolicyConfig } from '../../../fleet_package/types';
import { usePolicyConfigContext, defaultConfig } from '../../../fleet_package/contexts';

import { usePolicy } from '../../../fleet_package/hooks/use_policy';
import { validate } from '../../../fleet_package/validation';
import { useUpdateMonitor } from './use_update_monitor';

export const uptimeMonitorType = 'uptime-monitor';

interface Props {
  monitor: MonitorSavedObject;
  isEditFlow?: boolean;
  setIsFlyoutVisible: (val: boolean) => void;
}

export const MonitorConfigFlyout = ({ setIsFlyoutVisible, isEditFlow = false }: Props) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isTestRunning, setTestRunning] = useState(false);
  const [testMonitor, setTestMonitor] = useState<MonitorSavedObject>();
  const { monitorType } = usePolicyConfigContext();
  const [name, setName] = useState('');
  const policyConfig: PolicyConfig = usePolicy(name);
  const [locations, setLocations] = useState<string[]>([]);
  const { updatedMonitor, isValid } = useUpdateMonitor({
    monitorType,
    validate,
    config: { ...policyConfig[monitorType], name },
    defaultConfig: defaultConfig[monitorType],
  });

  const { refreshApp } = useContext(UptimeRefreshContext);

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

  const {
    services: { savedObjects },
  } = useKibana();

  const onSave = async (testRun?: boolean) => {
    const monitorData = {
      ...updatedMonitor,
      name,
    };
    if (isEditFlow) {
      await savedObjects?.client.update(
        uptimeMonitorType,
        'test-existing-monitor-to-be-edited-id',
        monitorData
      );
    } else {
      if (testRun) {
        const testMonitorT = await savedObjects?.client.create<MonitorSavedObject['attributes']>(
          uptimeMonitorType,
          {
            ...monitorData,
            runOnce: true,
            schedule: `@every 60m`,
            name: `Test run of (${name})`,
          }
        );
        setTestMonitor(testMonitorT);
      } else {
        await savedObjects?.client.create(uptimeMonitorType, monitorData);
      }
    }
    await apiService.get(API_URLS.SYNC_CONFIG);
    refreshApp();
  };

  const saveMonitor = async () => {
    if (isValid) {
      setIsSaving(true);
      await onSave();
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
      onSave(true);
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
        />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiButtonEmpty onClick={closeModal}>Cancel</EuiButtonEmpty>

        <EuiButton onClick={onTestRun} isLoading={isTestRunning}>
          Test run
        </EuiButton>

        <EuiButton onClick={saveMonitor} fill isLoading={isSaving}>
          Save
        </EuiButton>
      </EuiFlyoutFooter>
      <EuiHorizontalRule margin="xs" style={{ height: 2 }} />
      {testMonitor && (
        <TestRunResult monitorId={testMonitor?.id + '-inline'} monitor={testMonitor} />
      )}
    </EuiFlyout>
  );
};
