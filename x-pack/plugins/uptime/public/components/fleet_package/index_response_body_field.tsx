/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { EuiCheckbox, EuiFlexGroup, EuiFlexItem, EuiSelect } from '@elastic/eui';
import { ResponseBodyIndexPolicy } from './types';

interface Props {
  defaultValue: ResponseBodyIndexPolicy;
  onChange: (responseBodyIndexPolicy: ResponseBodyIndexPolicy) => void;
}

export const ResponseBodyIndexField = ({ defaultValue, onChange }: Props) => {
  const [policy, setPolicy] = useState<ResponseBodyIndexPolicy>(defaultValue);
  const [checked, setChecked] = useState<boolean>(defaultValue !== ResponseBodyIndexPolicy.NEVER);

  useEffect(() => {
    if (checked) {
      setPolicy(ResponseBodyIndexPolicy.ON_ERROR);
      onChange(ResponseBodyIndexPolicy.ON_ERROR);
    } else {
      onChange(ResponseBodyIndexPolicy.NEVER);
    }
  }, [checked, onChange]);

  useEffect(() => {
    onChange(policy);
  }, [onChange, policy]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiCheckbox
          id={'uptimeFleetIndexResponseHeaders'}
          checked={checked}
          label="Index response body"
          onChange={(event) => {
            const checkedEvent = event.target.checked;
            setChecked(checkedEvent);
            if (checked) {
              setPolicy(ResponseBodyIndexPolicy.NEVER);
            } else {
              setPolicy(policy);
            }
          }}
        />
      </EuiFlexItem>
      {checked && (
        <EuiFlexItem>
          <EuiSelect
            options={responseBodyIndexPolicyOptions}
            value={policy}
            onChange={(event) => {
              setPolicy(event.target.value as ResponseBodyIndexPolicy);
            }}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const responseBodyIndexPolicyOptions = [
  { value: ResponseBodyIndexPolicy.ALWAYS, text: 'Always' },
  { value: ResponseBodyIndexPolicy.ON_ERROR, text: 'On error' },
];
