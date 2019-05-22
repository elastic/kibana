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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ConfirmWatchesModal, ErrableFormRow } from '../../../../components';
import { putWatchApiUrl } from '../../../../lib/documentation_links';
import { onWatchSave, saveWatch } from '../../watch_edit_actions';
import { WatchContext } from '../../watch_context';
import { LicenseServiceContext } from '../../../../license_service_context';

export const JsonWatchEditForm = () => {
  const { watch, setWatchProperty } = useContext(WatchContext);
  const licenseService = useContext(LicenseServiceContext);

  const { errors } = watch.validate();
  const hasErrors = !!Object.keys(errors).find(errorKey => errors[errorKey].length >= 1);

  const [validationResult, setValidationResult] = useState<{
    type: string;
    title: string;
    message: string;
  } | null>(null);

  const [isSaving, setIsSaving] = useState<boolean>(false);

  const hasActionErrors = !!validationResult && validationResult.type === 'error';

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
      {validationResult && validationResult.type === 'warning' && (
        <ConfirmWatchesModal
          modalOptions={validationResult}
          callback={async isConfirmed => {
            if (isConfirmed) {
              saveWatch(watch, licenseService);
            }
            setValidationResult(null);
          }}
        />
      )}
      <EuiForm
        isInvalid={!!validationResult && validationResult.type === 'error'}
        error={validationResult && validationResult.message ? validationResult.message : []}
      >
        <ErrableFormRow
          id="watchId"
          label={i18n.translate('xpack.watcher.sections.watchEdit.json.form.watchIDLabel', {
            defaultMessage: 'ID',
          })}
          errorKey="id"
          isShowingErrors={hasErrors && watch.id !== undefined}
          errors={errors}
          fullWidth
        >
          <EuiFieldText
            fullWidth
            id="id"
            name="id"
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
        <EuiFormRow
          id="watchName"
          label={i18n.translate('xpack.watcher.sections.watchEdit.json.form.watchNameLabel', {
            defaultMessage: 'Name',
          })}
          fullWidth
        >
          <EuiFieldText
            fullWidth
            id="watchName"
            name="name"
            value={watch.name || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setWatchProperty('name', e.target.value);
            }}
            onBlur={() => {
              if (!watch.name) {
                setWatchProperty('name', '');
              }
            }}
          />
        </EuiFormRow>
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
                  defaultMessage: 'Syntax',
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
            fullWidth
            mode="json"
            width="100%"
            theme="github"
            aria-label={i18n.translate(
              'xpack.watcher.sections.watchEdit.json.form.watchJsonAriaLabel',
              {
                defaultMessage: 'Code editor',
              }
            )}
            value={watch.watchString}
            onChange={(json: string) => {
              if (validationResult && validationResult.type === 'error') {
                setValidationResult(null);
              }
              setWatchProperty('watchString', json);
            }}
          />
        </ErrableFormRow>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="btnSaveWatch"
              fill
              color="secondary"
              type="submit"
              iconType="check"
              isLoading={isSaving}
              isDisabled={hasErrors}
              onClick={async () => {
                setIsSaving(true);
                const savedWatch = await onWatchSave(watch, licenseService);
                if (savedWatch && savedWatch.validationError) {
                  setIsSaving(false);
                  return setValidationResult(savedWatch.validationError);
                }
              }}
            >
              {watch.isNew ? (
                <FormattedMessage
                  id="xpack.watcher.sections.watchEdit.json.createButtonLabel"
                  defaultMessage="Create"
                />
              ) : (
                <FormattedMessage
                  id="xpack.watcher.sections.watchEdit.json.saveButtonLabel"
                  defaultMessage="Save"
                />
              )}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty href={'#/management/elasticsearch/watcher/watches'}>
              {i18n.translate('xpack.watcher.sections.watchEdit.json.cancelButtonLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
    </Fragment>
  );
};
