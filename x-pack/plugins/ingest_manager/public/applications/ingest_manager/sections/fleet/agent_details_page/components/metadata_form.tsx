/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButtonEmpty,
  EuiPopover,
  EuiFormRow,
  EuiButton,
  EuiFlexItem,
  EuiFieldText,
  EuiFlexGroup,
  EuiForm,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AxiosError } from 'axios';
import { useAgentRefresh } from '../hooks';
import { useInput, sendRequest } from '../../../../hooks';
import { Agent } from '../../../../types';
import { agentRouteService } from '../../../../services';
import { flattenMetadata, unflattenMetadata } from './helper';

function useAddMetadataForm(agent: Agent, done: () => void) {
  const refreshAgent = useAgentRefresh();
  const keyInput = useInput();
  const valueInput = useInput();
  const [state, setState] = useState<{
    isLoading: boolean;
    error: null | string;
  }>({
    isLoading: false,
    error: null,
  });

  function clearInputs() {
    keyInput.clear();
    valueInput.clear();
  }

  function setError(error: AxiosError) {
    setState({
      isLoading: false,
      error: error.response && error.response.data ? error.response.data.message : error.message,
    });
  }

  async function success() {
    await refreshAgent();
    setState({
      isLoading: false,
      error: null,
    });
    clearInputs();
    done();
  }

  return {
    state,
    onSubmit: async (e: React.FormEvent | React.MouseEvent) => {
      e.preventDefault();
      setState({
        ...state,
        isLoading: true,
      });

      const metadata = unflattenMetadata({
        ...flattenMetadata(agent.user_provided_metadata),
        [keyInput.value]: valueInput.value,
      });

      try {
        const { error } = await sendRequest({
          path: agentRouteService.getUpdatePath(agent.id),
          method: 'put',
          body: JSON.stringify({
            user_provided_metadata: metadata,
          }),
        });

        if (error) {
          throw error;
        }
        await success();
      } catch (error) {
        setError(error);
      }
    },
    inputs: {
      keyInput,
      valueInput,
    },
  };
}

export const MetadataForm: React.FunctionComponent<{ agent: Agent }> = ({ agent }) => {
  const [isOpen, setOpen] = useState(false);

  const form = useAddMetadataForm(agent, () => {
    setOpen(false);
  });
  const { keyInput, valueInput } = form.inputs;

  const button = (
    <EuiButtonEmpty onClick={() => setOpen(true)} color={'text'}>
      <FormattedMessage
        id="xpack.ingestManager.metadataForm.addButton"
        defaultMessage="+ Add metadata"
      />
    </EuiButtonEmpty>
  );
  return (
    <>
      <EuiPopover
        id="trapFocus"
        ownFocus
        button={button}
        isOpen={isOpen}
        closePopover={() => setOpen(false)}
        initialFocus="[id=fleet-details-metadata-form]"
      >
        <form onSubmit={form.onSubmit}>
          <EuiForm error={form.state.error} isInvalid={form.state.error !== null}>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFormRow
                  id="fleet-details-metadata-form"
                  label={i18n.translate('xpack.ingestManager.metadataForm.keyLabel', {
                    defaultMessage: 'Key',
                  })}
                >
                  <EuiFieldText required={true} {...keyInput.props} />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  label={i18n.translate('xpack.ingestManager.metadataForm.valueLabel', {
                    defaultMessage: 'Value',
                  })}
                >
                  <EuiFieldText required={true} {...valueInput.props} />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormRow hasEmptyLabelSpace>
                  <EuiButton isLoading={form.state.isLoading} type={'submit'}>
                    <FormattedMessage
                      id="xpack.ingestManager.metadataForm.submitButtonText"
                      defaultMessage="Add"
                    />
                  </EuiButton>
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiForm>
        </form>
      </EuiPopover>
    </>
  );
};
