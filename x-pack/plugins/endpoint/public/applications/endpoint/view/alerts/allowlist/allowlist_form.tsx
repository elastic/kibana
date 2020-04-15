/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback } from 'react';
import { EuiForm, EuiFormRow, EuiSpacer, EuiText, EuiTextArea } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDispatch } from 'react-redux';
import { AllowlistCheckboxes } from './allowlist_checkboxes';
import * as selectors from '../../../store/alerts/selectors';
import { useAlertListSelector } from '../hooks/use_alerts_selector';
import { AlertAction } from '../../../store/alerts';

export const AllowlistForm = memo(() => {
  const dispatch: (action: AlertAction) => unknown = useDispatch();
  const { comment } = useAlertListSelector(selectors.allowlistForm);

  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      dispatch({
        type: 'userChangedAllowlistForm',
        payload: [event.target.name, event.target.value],
      });
    },
    [dispatch]
  );

  return (
    <EuiForm>
      <EuiText>
        <h4>
          {i18n.translate('xpack.endpoint.application.endpoint.alerts.allowModal.subtitle', {
            defaultMessage: 'Allowlist and restore this file based on the following attribute(s):',
          })}
        </h4>
      </EuiText>
      <EuiSpacer />
      <EuiText>
        <p>
          {i18n.translate('xpack.endpoint.application.endpoint.alerts.allowModal.description', {
            defaultMessage:
              'Any file in quarantine on any endpoint that matches the attribute(s) selected will automatically be restored to its original location.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="xxl" />
      <AllowlistCheckboxes />
      <EuiSpacer />
      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.endpoint.application.endpoint.alerts.allowModal.commentLabel',
          {
            defaultMessage: 'Comment (Optional)',
          }
        )}
      >
        <EuiTextArea fullWidth value={comment} name="comment" onChange={onChange} />
      </EuiFormRow>

      <EuiSpacer />
    </EuiForm>
  );
});
