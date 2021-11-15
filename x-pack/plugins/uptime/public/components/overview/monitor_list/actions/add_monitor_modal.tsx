/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment, useEffect, useContext } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiRange,
  EuiSuperSelect,
  EuiText,
  EuiTextArea,
  EuiComboBox,
  EuiHorizontalRule,
} from '@elastic/eui';
import styled from 'styled-components';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { useServiceLocations } from './use_service_locations';
import { apiService } from '../../../../state/api/utils';
import { API_URLS } from '../../../../../common/constants';
import { UptimeRefreshContext } from '../../../../contexts';
import { MonitorSavedObject } from '../../../../../common/types';
import { TestRunResult } from './TestRunResult';
export const uptimeMonitorType = 'uptime-monitor';

interface Props {
  monitor: MonitorSavedObject;
  setIsModalVisible: (val: boolean) => void;
}
const defaultTags = ['production', 'staging', 'dev', 'testing'];

const superSelectOptions = [
  {
    value: 'http',
    inputDisplay: 'HTTP',
    dropdownDisplay: (
      <Fragment>
        <strong>HTTP</strong>
        <EuiText size="s" color="subdued">
          <p className="euiTextColor--subdued">
            Has a short description giving more detail to the option.
          </p>
        </EuiText>
      </Fragment>
    ),
  },
  {
    value: 'tcp',
    inputDisplay: 'TCP',
    dropdownDisplay: (
      <Fragment>
        <strong>TCP</strong>
        <EuiText size="s" color="subdued">
          <p className="euiTextColor--subdued">
            Has a short description giving more detail to the option.
          </p>
        </EuiText>
      </Fragment>
    ),
  },
  {
    value: 'icmp',
    inputDisplay: 'ICMP',
    dropdownDisplay: (
      <Fragment>
        <strong>ICMP</strong>
        <EuiText size="s" color="subdued">
          <p className="euiTextColor--subdued">
            Has a short description giving more detail to the option.
          </p>
        </EuiText>
      </Fragment>
    ),
  },
  {
    value: 'browser',
    inputDisplay: 'Browser',
    dropdownDisplay: (
      <Fragment>
        <strong>Browser</strong>
        <EuiText size="s" color="subdued">
          <p className="euiTextColor--subdued">
            Has a short description giving more detail to the option.
          </p>
        </EuiText>
      </Fragment>
    ),
  },
];

export const AddMonitorModal = ({ setIsModalVisible, monitor }: Props) => {
  const existingObj = monitor?.attributes ?? {};

  const [monitorType, setMonitorType] = useState(existingObj.type ?? 'browser');
  const [name, setName] = useState(existingObj.name ?? '');
  const [urls, setUrls] = useState(existingObj.urls?.[0] ?? '');
  const [tags, setTags] = useState(existingObj.tags ?? []);
  const [locations, setLocations] = useState<string[]>([]);
  const [schedule, setSchedule] = useState(2);
  const [inlineScript, setInlineScript] = useState(
    existingObj.source?.inline.script ??
      'step("load homepage", async () => { await page.goto(\'https://www.elastic.co\'); });'
  );

  const [isSaving, setIsSaving] = useState(false);

  const [isTestRunning, setTestRunning] = useState(false);
  const [testMonitor, setTestMonitor] = useState<MonitorSavedObject>();

  const { locations: serviceLocations } = useServiceLocations();

  const { refreshApp } = useContext(UptimeRefreshContext);

  const modalFormId = 'testForm';

  const {
    services: { savedObjects },
  } = useKibana();

  const onSave = async (testRun?: boolean) => {
    const monitorData = {
      name,
      ...(monitorType !== 'browser'
        ? { urls: [urls] }
        : { source: { inline: { script: inlineScript } } }),
      schedule: `@every ${schedule}m`,
      type: monitorType,
      tags,
    };
    if (monitor) {
      await savedObjects?.client.update(uptimeMonitorType, monitor.id, monitorData);
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
    if (name && (urls || inlineScript) && schedule && monitorType && locations.length > 0) {
      setIsSaving(true);
      await onSave();
      setIsModalVisible(false);
    }
  };

  const closeModal = async () => {
    setIsModalVisible(false);
  };

  const onTestRun = () => {
    if (name && (urls || inlineScript) && schedule && monitorType && locations.length > 0) {
      setTestRunning(true);
      onSave(true);
    } else {
      if (!name) {
      }
    }
  };

  const locOpts = Object.entries(serviceLocations).map(([name, loc]) => ({
    label: loc.geo.name,
    value: name,
  }));

  const tagOpts = [...new Set([...tags, ...defaultTags])].map((tag) => ({
    label: tag,
    value: tag,
  }));

  const selectedOpts = locOpts.filter(({ value }) => locations.includes(value));

  const selectedTag = tagOpts.filter(({ value }) => tags.includes(value));

  useEffect(() => {
    if (locOpts.length === 1 && locations.length === 0) {
      setLocations(locOpts.map(({ value }) => value));
    }
  }, [locOpts]);

  const formSample = (
    <EuiForm id={modalFormId} component="form">
      <EuiFormRow label="Name" fullWidth={true}>
        <EuiFieldText
          autoFocus={true}
          defaultValue={name}
          required={true}
          fullWidth={true}
          name="name"
          onChange={(event) => setName(event.target.value)}
        />
      </EuiFormRow>

      <EuiFormRow label="Monitor type" fullWidth={true}>
        <EuiSuperSelect
          fullWidth={true}
          options={superSelectOptions}
          valueOfSelected={monitorType}
          onChange={(value) => onSuperSelectChange(value)}
          itemLayoutAlign="top"
          hasDividers
        />
      </EuiFormRow>

      {monitorType !== 'browser' ? (
        <EuiFormRow label="URL" fullWidth={true}>
          <EuiFieldText
            fullWidth={true}
            name="url"
            onChange={(event) => setUrls(event.target.value)}
          />
        </EuiFormRow>
      ) : (
        <EuiFormRow label="Inline script" fullWidth={true}>
          <EuiTextArea
            fullWidth={true}
            placeholder="Placeholder text"
            value={inlineScript}
            onChange={(event) => setInlineScript(event.target.value)}
          />
        </EuiFormRow>
      )}

      <EuiFormRow label="Schedule" helpText="In minutes" fullWidth={true}>
        <EuiRange
          value={schedule}
          fullWidth={true}
          min={0}
          max={60}
          name="schedule"
          tickInterval={5}
          showInput={true}
          showTicks={true}
          onChange={(event) => setSchedule(event.target.value)}
        />
      </EuiFormRow>

      <EuiFormRow label="Tags" fullWidth={true}>
        <EuiComboBox
          selectedOptions={selectedTag}
          fullWidth={true}
          options={tagOpts}
          onChange={(selOptions) => setTags(selOptions.map(({ value }) => value as string))}
        />
      </EuiFormRow>

      <EuiFormRow label={'Service locations'} fullWidth={true}>
        <EuiComboBox
          selectedOptions={selectedOpts}
          fullWidth={true}
          options={locOpts}
          onChange={(selOptions) => setLocations(selOptions.map(({ value }) => value as string))}
        />
      </EuiFormRow>
    </EuiForm>
  );

  const onSuperSelectChange = (value) => {
    setMonitorType(value);
  };

  return (
    <FlexModal
      onClose={closeModal}
      initialFocus="[name=popswitch]"
      style={{ width: 650, height: '90vh' }}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <h1>{monitor ? 'Edit monitor' : 'Add monitor'}</h1>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>{formSample}</EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={closeModal}>Cancel</EuiButtonEmpty>

        <EuiButton onClick={onTestRun}>{testMonitor ? 'Update Test run' : 'Test run'}</EuiButton>

        <EuiButton onClick={saveMonitor} fill isLoading={isSaving}>
          Save
        </EuiButton>
      </EuiModalFooter>
      <EuiHorizontalRule margin="xs" style={{ height: 2 }} />
      {testMonitor && (
        <TestRunResult monitorId={testMonitor?.id + '-inline'} monitor={testMonitor} />
      )}
    </FlexModal>
  );
};

const FlexModal = styled(EuiModal)`
  &&& {
    .euiModal__flex {
      max-height: initial;
    }
  }
`;
