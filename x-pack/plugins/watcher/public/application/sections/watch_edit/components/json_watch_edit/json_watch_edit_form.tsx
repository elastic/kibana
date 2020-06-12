/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useContext, useState } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeEditor,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { serializeJsonWatch } from '../../../../../../common/lib/serialization';
import { ErrableFormRow, SectionError, Error as ServerError } from '../../../../components';
import { useXJsonMode } from '../../../../shared_imports';
import { onWatchSave } from '../../watch_edit_actions';
import { WatchContext } from '../../watch_context';
import { goToWatchList } from '../../../../lib/navigation';
import { RequestFlyout } from '../request_flyout';
import { useAppContext } from '../../../../app_context';

export const JsonWatchEditForm = () => {
  const {
    links: { putWatchApiUrl },
    toasts,
  } = useAppContext();

  const { watch, setWatchProperty } = useContext(WatchContext);
  const { xJsonMode, convertToJson, setXJson, xJson } = useXJsonMode(watch.watchString);

  const { errors } = watch.validate();
  const hasErrors = !!Object.keys(errors).find((errorKey) => errors[errorKey].length >= 1);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isRequestVisible, setIsRequestVisible] = useState<boolean>(false);

  const [serverError, setServerError] = useState<ServerError | null>(null);

  const [isSaving, setIsSaving] = useState<boolean>(false);

  const hasActionErrors = !!validationError;

  const invalidActionMessage = i18n.translate(
    'xpack.watcher.sections.watchEdit.json.form.actionValidationErrorMessage',
    {
      defaultMessage: 'Invalid watch actions',
    }
  );

  const jsonErrors = {
    ...errors,
    json: hasActionErrors ? [...errors.json, invalidActionMessage] : [...errors.json],
  };

  if (errors.json.length === 0) {
    setWatchProperty('watch', JSON.parse(watch.watchString));
  }

  return (
    <Fragment>
      <EuiForm
        isInvalid={hasActionErrors}
        error={validationError ? validationError : []}
        data-test-subj="jsonWatchForm"
      >
        {serverError && (
          <Fragment>
            <SectionError
              title={
                <FormattedMessage
                  id="xpack.watcher.sections.watchEdit.json.saveWatchErrorTitle"
                  defaultMessage="Error saving watch"
                />
              }
              error={serverError}
              data-test-subj="sectionError"
            />
            <EuiSpacer />
          </Fragment>
        )}

        <EuiFormRow
          id="watchName"
          label={i18n.translate('xpack.watcher.sections.watchEdit.json.form.watchNameLabel', {
            defaultMessage: 'Name (optional)',
          })}
        >
          <EuiFieldText
            id="watchName"
            name="name"
            value={watch.name || ''}
            data-test-subj="nameInput"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const watchName = e.target.value;
              setWatchProperty('name', watchName);
            }}
            onBlur={() => {
              if (!watch.name) {
                setWatchProperty('name', '');
              }
            }}
          />
        </EuiFormRow>

        <ErrableFormRow
          id="watchId"
          label={i18n.translate('xpack.watcher.sections.watchEdit.json.form.watchIDLabel', {
            defaultMessage: 'ID',
          })}
          errorKey="id"
          isShowingErrors={hasErrors && watch.id !== undefined}
          errors={errors}
        >
          <EuiFieldText
            id="id"
            name="id"
            data-test-subj="idInput"
            value={watch.id || ''}
            readOnly={!watch.isNew}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setWatchProperty('id', e.target.value);
            }}
            onBlur={() => {
              if (!watch.id) {
                setWatchProperty('id', '');
              }
            }}
          />
        </ErrableFormRow>

        <EuiSpacer size="m" />

        <ErrableFormRow
          id="watchJson"
          label={
            <Fragment>
              {i18n.translate('xpack.watcher.sections.watchEdit.json.form.watchJsonLabel', {
                defaultMessage: 'Watch JSON',
              })}{' '}
              (
              <EuiLink href={putWatchApiUrl} target="_blank">
                {i18n.translate('xpack.watcher.sections.watchEdit.json.form.watchJsonDocLink', {
                  defaultMessage: 'API syntax',
                })}
              </EuiLink>
              )
            </Fragment>
          }
          errorKey="json"
          isShowingErrors={hasErrors || hasActionErrors}
          fullWidth
          errors={jsonErrors}
        >
          <EuiCodeEditor
            mode={xJsonMode}
            width="100%"
            theme="textmate"
            data-test-subj="jsonEditor"
            aria-label={i18n.translate(
              'xpack.watcher.sections.watchEdit.json.form.watchJsonAriaLabel',
              {
                defaultMessage: 'Code editor',
              }
            )}
            value={xJson}
            onChange={(xjson: string) => {
              if (validationError) {
                setValidationError(null);
              }
              setXJson(xjson);
              // Keep the watch in sync with the editor content
              setWatchProperty('watchString', convertToJson(xjson));
            }}
          />
        </ErrableFormRow>

        <EuiSpacer />

        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexGroup gutterSize="m" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="saveWatchButton"
                fill
                color="secondary"
                type="submit"
                iconType="check"
                isLoading={isSaving}
                isDisabled={hasErrors}
                onClick={async () => {
                  setIsSaving(true);
                  const savedWatch = await onWatchSave(watch, toasts);
                  if (savedWatch && savedWatch.error) {
                    const { data } = savedWatch.error;
                    setIsSaving(false);

                    if (data && data.error === 'validation') {
                      return setValidationError(data.message);
                    }

                    return setServerError(savedWatch.error);
                  }
                }}
              >
                {watch.isNew ? (
                  <FormattedMessage
                    id="xpack.watcher.sections.watchEdit.json.createButtonLabel"
                    defaultMessage="Create watch"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.watcher.sections.watchEdit.json.saveButtonLabel"
                    defaultMessage="Save watch"
                  />
                )}
              </EuiButton>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButtonEmpty data-test-subj="btnCancelWatch" onClick={() => goToWatchList()}>
                {i18n.translate('xpack.watcher.sections.watchEdit.json.cancelButtonLabel', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={() => setIsRequestVisible(!isRequestVisible)}>
              {isRequestVisible ? (
                <FormattedMessage
                  id="xpack.watcher.sections.watchEdit.json.hideRequestButtonLabel"
                  defaultMessage="Hide request"
                />
              ) : (
                <FormattedMessage
                  id="xpack.watcher.sections.watchEdit.json.showRequestButtonLabel"
                  defaultMessage="Show request"
                />
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>

      {isRequestVisible ? (
        <RequestFlyout
          id={watch.id}
          payload={serializeJsonWatch(watch.name, watch.watch)}
          close={() => setIsRequestVisible(false)}
        />
      ) : null}
    </Fragment>
  );
};
