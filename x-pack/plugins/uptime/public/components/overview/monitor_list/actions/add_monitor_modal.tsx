/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment } from 'react';

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
  EuiSwitch,
  EuiSuperSelect,
  EuiText,
} from '@elastic/eui';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
export const uptimeMonitorType = 'uptime-monitor';

const ctt = {
  attributes: { id: 'test-id', name: 'test monitor', schedule: '@every 1min', type: 'http' },
  coreMigrationVersion: '8.1.0',
  id: 'ec712e00-43d8-11ec-a737-3fa82f94dcb7',
  references: [],
  type: 'uptime-monitor',
  updated_at: '2021-11-12T16:52:30.226Z',
  version: 'WzExNjg3LDFd',
};

interface Props {
  setIsModalVisible: () => void;
}

export const AddMonitorModal = ({ setIsModalVisible }: Props) => {
  const [superSelectvalue, setSuperSelectValue] = useState('option_one');

  const modalFormId = 'testForm';

  const {
    services: { savedObjects },
  } = useKibana();

  const onSave = () => {
    savedObjects?.client.create(uptimeMonitorType, {
      name: 'test monitor',
      type: 'http',
      schedule: '@every 1min',
      id: 'test-id',
    });
  };

  const closeModal = () => {
    onSave();
  };

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

  const formSample = (
    <EuiForm id={modalFormId} component="form">
      <EuiFormRow label="Name">
        <EuiFieldText name="name" />
      </EuiFormRow>

      <EuiFormRow label="Schedule" helpText="In minutes">
        <EuiRange
          min={1}
          max={60}
          name="schedule"
          tickInterval={10}
          value={2}
          showInput={true}
          showTicks={true}
        />
      </EuiFormRow>

      <EuiFormRow label="Monitor type">
        <EuiSuperSelect
          options={superSelectOptions}
          valueOfSelected={superSelectvalue}
          onChange={(value) => onSuperSelectChange(value)}
          itemLayoutAlign="top"
          hasDividers
        />
      </EuiFormRow>
    </EuiForm>
  );

  const onSuperSelectChange = (value) => {
    setSuperSelectValue(value);
  };

  return (
    <EuiModal onClose={closeModal} initialFocus="[name=popswitch]">
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <h1>Add monitor</h1>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>{formSample}</EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={closeModal}>Cancel</EuiButtonEmpty>

        <EuiButton onClick={closeModal} fill>
          Save
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
