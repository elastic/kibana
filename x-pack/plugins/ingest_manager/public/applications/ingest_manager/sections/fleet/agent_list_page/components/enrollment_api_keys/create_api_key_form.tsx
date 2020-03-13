/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldText,
  EuiButton,
  EuiSelect,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useInput, sendRequest } from '../../../../../hooks';
import { useConfigs } from './hooks';
import { enrollmentAPIKeyRouteService } from '../../../../../services';

export const CreateApiKeyForm: React.FunctionComponent<{ onChange: () => void }> = ({
  onChange,
}) => {
  const { data: configs } = useConfigs();
  const { inputs, onSubmit, submitted } = useCreateApiKey(() => onChange());

  return (
    <EuiFlexGroup style={{ maxWidth: 600 }}>
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('xpack.ingestManager.apiKeysForm.nameLabel', {
            defaultMessage: 'Key Name',
          })}
        >
          <EuiFieldText autoComplete={'false'} {...inputs.nameInput.props} />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('xpack.ingestManager.apiKeysForm.configLabel', {
            defaultMessage: 'Config',
          })}
        >
          <EuiSelect
            {...inputs.configIdInput.props}
            options={configs.map(config => ({
              value: config.id,
              text: config.name,
            }))}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFormRow hasEmptyLabelSpace>
          <EuiButton disabled={submitted} onClick={() => onSubmit()}>
            <FormattedMessage
              id="xpack.ingestManager.apiKeysForm.saveButton"
              defaultMessage="Save"
            />
          </EuiButton>
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

function useCreateApiKey(onSuccess: () => void) {
  const [submitted, setSubmitted] = React.useState(false);
  const inputs = {
    nameInput: useInput(),
    configIdInput: useInput('default'),
  };

  const onSubmit = async () => {
    setSubmitted(true);
    await sendRequest({
      method: 'post',
      path: enrollmentAPIKeyRouteService.getCreatePath(),
      body: JSON.stringify({
        name: inputs.nameInput.value,
        config_id: inputs.configIdInput.value,
      }),
    });
    setSubmitted(false);
    onSuccess();
  };

  return {
    inputs,
    onSubmit,
    submitted,
  };
}
