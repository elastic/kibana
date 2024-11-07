/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Fragment, useEffect, useMemo, useRef } from 'react';
import { debounce } from 'lodash';
import { EuiCallOut, EuiFieldText, EuiForm, EuiFormRow, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { extractErrorMessage } from '@kbn/ml-error-utils';

import { dynamic } from '@kbn/shared-ux-utility';
import { useMlApi, useNotifications } from '../../../../../contexts/kibana';
import type { CreateAnalyticsFormProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { CreateStep } from '../create_step';
import { ANALYTICS_STEPS } from '../../page';

const EditorComponent = dynamic(async () => ({
  default: (await import('./editor_component')).EditorComponent,
}));

export const CreateAnalyticsAdvancedEditor: FC<CreateAnalyticsFormProps> = (props) => {
  const mlApi = useMlApi();
  const { actions, state } = props;
  const { setAdvancedEditorRawString, setFormState } = actions;

  const { advancedEditorMessages, advancedEditorRawString, isJobCreated } = state;

  const { jobId, jobIdEmpty, jobIdExists, jobIdValid } = state.form;

  const forceInput = useRef<HTMLInputElement | null>(null);
  const { toasts } = useNotifications();

  const onChange = (str: string) => {
    setAdvancedEditorRawString(str);
  };

  const debouncedJobIdCheck = useMemo(
    () =>
      debounce(async () => {
        try {
          const results = await mlApi.dataFrameAnalytics.jobsExist([jobId], true);
          setFormState({ jobIdExists: results[jobId].exists });
        } catch (e) {
          toasts.addDanger(
            i18n.translate(
              'xpack.ml.dataframe.analytics.create.advancedEditor.errorCheckingJobIdExists',
              {
                defaultMessage: 'The following error occurred checking if job id exists: {error}',
                values: { error: extractErrorMessage(e) },
              }
            )
          );
        }
      }, 400),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [jobId]
  );

  // Temp effect to close the context menu popover on Clone button click
  useEffect(() => {
    if (forceInput.current === null) {
      return;
    }
    const evt = document.createEvent('MouseEvents');
    evt.initEvent('mouseup', true, true);
    forceInput.current.dispatchEvent(evt);
  }, []);

  useEffect(() => {
    if (jobIdValid === true) {
      debouncedJobIdCheck();
    } else if (typeof jobId === 'string' && jobId.trim() === '' && jobIdExists === true) {
      setFormState({ jobIdExists: false });
    }

    return () => {
      debouncedJobIdCheck.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  return (
    <EuiForm className="mlDataFrameAnalyticsCreateForm">
      <EuiFormRow
        label={i18n.translate('xpack.ml.dataframe.analytics.create.advancedEditor.jobIdLabel', {
          defaultMessage: 'Analytics job ID',
        })}
        isInvalid={(!jobIdEmpty && !jobIdValid) || jobIdExists}
        error={[
          ...(!jobIdEmpty && !jobIdValid
            ? [
                i18n.translate(
                  'xpack.ml.dataframe.analytics.create.advancedEditor.jobIdInvalidError',
                  {
                    defaultMessage:
                      'Must contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores only and must start and end with alphanumeric characters.',
                  }
                ),
              ]
            : []),
          ...(jobIdExists
            ? [
                i18n.translate(
                  'xpack.ml.dataframe.analytics.create.advancedEditor.jobIdExistsError',
                  {
                    defaultMessage: 'An analytics job with this ID already exists.',
                  }
                ),
              ]
            : []),
        ]}
      >
        <EuiFieldText
          inputRef={(input) => {
            if (input) {
              forceInput.current = input;
            }
          }}
          disabled={isJobCreated}
          placeholder="analytics job ID"
          value={jobId}
          onChange={(e) => setFormState({ jobId: e.target.value })}
          aria-label={i18n.translate(
            'xpack.ml.dataframe.analytics.create.advancedEditor.jobIdInputAriaLabel',
            {
              defaultMessage: 'Choose a unique analytics job ID.',
            }
          )}
          isInvalid={(!jobIdEmpty && !jobIdValid) || jobIdExists}
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate(
          'xpack.ml.dataframe.analytics.create.advancedEditor.configRequestBody',
          {
            defaultMessage: 'Configuration request body',
          }
        )}
        style={{ maxWidth: '100%' }}
      >
        <div data-test-subj={'mlAnalyticsCreateJobWizardAdvancedEditorCodeEditor'}>
          <EditorComponent
            value={advancedEditorRawString}
            onChange={onChange}
            readOnly={isJobCreated}
          />
        </div>
      </EuiFormRow>
      <EuiSpacer />
      {advancedEditorMessages.map((advancedEditorMessage, i) => (
        <Fragment key={i}>
          <EuiCallOut
            title={
              advancedEditorMessage.message !== ''
                ? advancedEditorMessage.message
                : advancedEditorMessage.error
            }
            color={advancedEditorMessage.error !== undefined ? 'danger' : 'primary'}
            iconType={advancedEditorMessage.error !== undefined ? 'error' : 'checkInCircleFilled'}
            size="s"
          >
            {advancedEditorMessage.message !== '' && advancedEditorMessage.error !== undefined ? (
              <p>{advancedEditorMessage.error}</p>
            ) : null}
          </EuiCallOut>
          <EuiSpacer />
        </Fragment>
      ))}
      <EuiSpacer />
      <CreateStep {...props} step={ANALYTICS_STEPS.CREATE} showCreateDataView={true} />
    </EuiForm>
  );
};
