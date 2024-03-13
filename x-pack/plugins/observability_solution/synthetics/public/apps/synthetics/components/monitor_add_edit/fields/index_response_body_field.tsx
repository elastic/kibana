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
import { ResponseBodyIndexPolicy } from '../types';

export interface ResponseBodyIndexFieldProps {
  defaultValue: ResponseBodyIndexPolicy;
  onChange: (responseBodyIndexPolicy: ResponseBodyIndexPolicy) => void;
  onBlur?: () => void;
  readOnly?: boolean;
}

export const ResponseBodyIndexField = ({
  defaultValue,
  onChange,
  onBlur,
  readOnly,
}: ResponseBodyIndexFieldProps) => {
  const [policy, setPolicy] = useState<ResponseBodyIndexPolicy>(defaultValue);
  const [checked, setChecked] = useState<boolean>(defaultValue !== ResponseBodyIndexPolicy.NEVER);

  useEffect(() => {
    if (checked) {
      const defaultOrSelected =
        policy === ResponseBodyIndexPolicy.NEVER ? ResponseBodyIndexPolicy.ON_ERROR : policy;
      setPolicy(defaultOrSelected);
      onChange(defaultOrSelected);
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
              id="xpack.synthetics.monitorConfig.indexResponseBody.label"
              defaultMessage="Index response body"
            />
          }
          onChange={(event) => {
            const checkedEvent = event.target.checked;
            setChecked(checkedEvent);
          }}
          onBlur={() => onBlur?.()}
          disabled={readOnly}
        />
      </EuiFlexItem>
      {checked && (
        <EuiFlexItem>
          <EuiSelect
            aria-label={i18n.translate(
              'xpack.synthetics.monitorConfig.indexResponseBodyPolicy.label',
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
            disabled={readOnly}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const responseBodyIndexPolicyOptions = [
  {
    value: ResponseBodyIndexPolicy.ON_ERROR,
    text: i18n.translate(
      'xpack.synthetics.createPackagePolicy.stepConfigure.responseBodyIndex.onError',
      {
        defaultMessage: 'On error',
      }
    ),
  },
  {
    value: ResponseBodyIndexPolicy.ALWAYS,
    text: i18n.translate(
      'xpack.synthetics.createPackagePolicy.stepConfigure.responseBodyIndex.always',
      {
        defaultMessage: 'Always',
      }
    ),
  },
];
