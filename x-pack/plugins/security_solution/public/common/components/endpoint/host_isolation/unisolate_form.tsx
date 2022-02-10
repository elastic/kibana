/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEventHandler, memo, useCallback } from 'react';
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
import { CANCEL, COMMENT, COMMENT_PLACEHOLDER, CONFIRM, UNISOLATE, ISOLATED } from './translations';
import { EndpointIsolatedFormProps } from './isolate_form';

export const EndpointUnisolateForm = memo<EndpointIsolatedFormProps>(
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
                id="xpack.securitySolution.endpoint.hostIsolation.unIsolateThisHost"
                defaultMessage="{hostName} is currently {isolated}. Are you sure you want to {unisolate} this host?"
                values={{
                  hostName: <b>{hostName}</b>,
                  isolated: <b>{ISOLATED}</b>,
                  unisolate: <b>{UNISOLATE}</b>,
                }}
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
              <EuiButtonEmpty onClick={onCancel} disabled={isLoading}>
                {CANCEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton fill onClick={onConfirm} disabled={isLoading} isLoading={isLoading}>
                {CONFIRM}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </EuiForm>
    );
  }
);

EndpointUnisolateForm.displayName = 'EndpointUnisolateForm';
