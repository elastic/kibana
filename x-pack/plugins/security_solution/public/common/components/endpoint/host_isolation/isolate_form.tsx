/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEventHandler, memo, ReactNode, useCallback } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CANCEL, COMMENT, COMMENT_PLACEHOLDER, CONFIRM } from './translations';

export interface EndpointIsolatedFormProps {
  hostName: string;
  onCancel: () => void;
  onConfirm: () => void;
  onChange: (changes: { comment: string }) => void;
  comment?: string;
  /** Any additional message to be appended to the default one */
  messageAppend?: ReactNode;
  /** If true, then `Confirm` and `Cancel` buttons will be disabled, and `Confirm` button will loading loading style */
  isLoading?: boolean;
}

export const EndpointIsolateForm = memo<EndpointIsolatedFormProps>(
  ({ hostName, onCancel, onConfirm, onChange, comment = '', messageAppend, isLoading = false }) => {
    const handleCommentChange: ChangeEventHandler<HTMLTextAreaElement> = useCallback(
      (event) => {
        onChange({ comment: event.target.value });
      },
      [onChange]
    );

    return (
      <EuiForm>
        <EuiFormRow fullWidth>
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.hostIsolation.isolateThisHost"
                defaultMessage="Isolate host {hostName} from network."
                values={{ hostName: <b>{hostName}</b> }}
              />
              <br />
            </p>
            <p>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.hostIsolation.isolateThisHostAbout"
                defaultMessage="Isolating a host will disconnect it from the network. The host will only be able to communicate with the Kibana platform."
              />{' '}
              {messageAppend}
            </p>
          </EuiText>
        </EuiFormRow>

        <EuiFormRow label={COMMENT} fullWidth>
          <EuiTextArea
            data-test-subj="host_isolation_comment"
            fullWidth
            placeholder={COMMENT_PLACEHOLDER}
            value={comment}
            onChange={handleCommentChange}
          />
        </EuiFormRow>

        <EuiFormRow fullWidth>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={onCancel}
                disabled={isLoading}
                data-test-subj="hostIsolateCancelButton"
              >
                {CANCEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={onConfirm}
                disabled={isLoading}
                isLoading={isLoading}
                data-test-subj="hostIsolateConfirmButton"
              >
                {CONFIRM}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </EuiForm>
    );
  }
);

EndpointIsolateForm.displayName = 'EndpointIsolateForm';
