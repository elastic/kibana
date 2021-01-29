/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useEffect, useMemo, useRef } from 'react';
import { debounce } from 'lodash';
import {
  EuiCallOut,
  EuiCodeEditor,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { XJsonMode } from '../../../../../../../shared_imports';

const xJsonMode = new XJsonMode();

import { useNotifications } from '../../../../../contexts/kibana';
import { ml } from '../../../../../services/ml_api_service';
import { extractErrorMessage } from '../../../../../../../common/util/errors';
import { CreateAnalyticsFormProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { CreateStep } from '../create_step';
import { ANALYTICS_STEPS } from '../../page';

export const CreateAnalyticsAdvancedEditor: FC<CreateAnalyticsFormProps> = (props) => {
  const { actions, state } = props;
  const { setAdvancedEditorRawString, setFormState } = actions;

  const { advancedEditorMessages, advancedEditorRawString, isJobCreated } = state;

  const {
    createIndexPattern,
    destinationIndexPatternTitleExists,
    jobId,
    jobIdEmpty,
    jobIdExists,
    jobIdValid,
  } = state.form;

  const forceInput = useRef<HTMLInputElement | null>(null);
  const { toasts } = useNotifications();

  const onChange = (str: string) => {
    setAdvancedEditorRawString(str);
  };

  const debouncedJobIdCheck = useMemo(
    () =>
      debounce(async () => {
        try {
          const { results } = await ml.dataFrameAnalytics.jobsExists([jobId], true);
          setFormState({ jobIdExists: results[jobId] });
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
        <EuiCodeEditor
          isReadOnly={isJobCreated}
          mode={xJsonMode}
          width="100%"
          value={advancedEditorRawString}
          onChange={onChange}
          setOptions={{
            fontSize: '12px',
          }}
          theme="textmate"
          aria-label={i18n.translate(
            'xpack.ml.dataframe.analytics.create.advancedEditor.codeEditorAriaLabel',
            {
              defaultMessage: 'Advanced analytics job editor',
            }
          )}
        />
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
            iconType={advancedEditorMessage.error !== undefined ? 'alert' : 'checkInCircleFilled'}
            size="s"
          >
            {advancedEditorMessage.message !== '' && advancedEditorMessage.error !== undefined ? (
              <p>{advancedEditorMessage.error}</p>
            ) : null}
          </EuiCallOut>
          <EuiSpacer />
        </Fragment>
      ))}
      {!isJobCreated && (
        <Fragment>
          <EuiFormRow
            isInvalid={createIndexPattern && destinationIndexPatternTitleExists}
            error={
              createIndexPattern &&
              destinationIndexPatternTitleExists && [
                i18n.translate(
                  'xpack.ml.dataframe.analytics.create.indexPatternAlreadyExistsError',
                  {
                    defaultMessage: 'An index pattern with this title already exists.',
                  }
                ),
              ]
            }
          >
            <EuiSwitch
              disabled={isJobCreated}
              name="mlDataFrameAnalyticsCreateIndexPattern"
              label={i18n.translate('xpack.ml.dataframe.analytics.create.createIndexPatternLabel', {
                defaultMessage: 'Create index pattern',
              })}
              checked={createIndexPattern === true}
              onChange={() => setFormState({ createIndexPattern: !createIndexPattern })}
            />
          </EuiFormRow>
        </Fragment>
      )}
      <EuiSpacer />
      <CreateStep {...props} step={ANALYTICS_STEPS.CREATE} />
    </EuiForm>
  );
};
