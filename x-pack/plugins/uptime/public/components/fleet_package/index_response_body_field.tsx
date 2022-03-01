/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiCheckbox, EuiFlexGroup, EuiFlexItem, EuiSelect } from '@elastic/eui';
import { ResponseBodyIndexPolicy } from './types';

interface Props {
  defaultValue: ResponseBodyIndexPolicy;
  onChange: (responseBodyIndexPolicy: ResponseBodyIndexPolicy) => void;
  onBlur?: () => void;
}

export const ResponseBodyIndexField = ({ defaultValue, onChange, onBlur }: Props) => {
  const [policy, setPolicy] = useState<ResponseBodyIndexPolicy>(
    defaultValue !== ResponseBodyIndexPolicy.NEVER ? defaultValue : ResponseBodyIndexPolicy.ON_ERROR
  );
  const [checked, setChecked] = useState<boolean>(defaultValue !== ResponseBodyIndexPolicy.NEVER);

  useEffect(() => {
    if (checked) {
      setPolicy(policy);
      onChange(policy);
    } else {
      onChange(ResponseBodyIndexPolicy.NEVER);
    }
  }, [checked, policy, setPolicy, onChange]);

  useEffect(() => {
    onChange(policy);
  }, [onChange, policy]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem data-test-subj="syntheticsIndexResponseBody">
        <EuiCheckbox
          id="uptimeFleetIndexResponseBody"
          checked={checked}
          label={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.responseConfig.indexResponseBody"
              defaultMessage="Index response body"
            />
          }
          onChange={(event) => {
            const checkedEvent = event.target.checked;
            setChecked(checkedEvent);
          }}
          onBlur={() => onBlur?.()}
        />
      </EuiFlexItem>
      {checked && (
        <EuiFlexItem>
          <EuiSelect
            aria-label={i18n.translate(
              'xpack.uptime.createPackagePolicy.stepConfigure.httpAdvancedOptions.responseConfig.responseBodyIndexPolicy',
              {
                defaultMessage: 'Response body index policy',
              }
            )}
            data-test-subj="indexResponseBodyFieldSelect"
            options={responseBodyIndexPolicyOptions}
            value={policy}
            onChange={(event) => {
              setPolicy(event.target.value as ResponseBodyIndexPolicy);
            }}
            onBlur={() => onBlur?.()}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const responseBodyIndexPolicyOptions = [
  {
    value: ResponseBodyIndexPolicy.ALWAYS,
    text: i18n.translate(
      'xpack.uptime.createPackagePolicy.stepConfigure.responseBodyIndex.always',
      {
        defaultMessage: 'Always',
      }
    ),
  },
  {
    value: ResponseBodyIndexPolicy.ON_ERROR,
    text: i18n.translate(
      'xpack.uptime.createPackagePolicy.stepConfigure.responseBodyIndex.onError',
      {
        defaultMessage: 'On error',
      }
    ),
  },
];
