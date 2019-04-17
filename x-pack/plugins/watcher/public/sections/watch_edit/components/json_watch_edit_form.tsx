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
import { ConfirmWatchesModal } from '../../../components/confirm_watches_modal';
import { ErrableFormRow } from '../../../components/form_errors';
import { documentationLinks } from '../../../lib/documentation_links';
import { onWatchSave, saveWatch } from '../watch_edit_actions';
import { WatchContext } from './watch_context';
import { LicenseServiceContext } from '../../../license_service_context';

export const JsonWatchEditForm = () => {
  const { watch, setWatchProperty } = useContext(WatchContext);
  // hooks
  const [modal, setModal] = useState<{ title: string; message: string } | null>(null);
  const { errors } = watch.validate();
  const hasErrors = !!Object.keys(errors).find(errorKey => errors[errorKey].length >= 1);
  const licenseService = useContext(LicenseServiceContext);

  if (errors.json.length === 0) {
    setWatchProperty('watch', JSON.parse(watch.watchString));
  }

  return (
    <Fragment>
      <ConfirmWatchesModal
        modalOptions={modal}
        callback={async isConfirmed => {
          if (isConfirmed) {
            saveWatch(watch, licenseService);
          }
          setModal(null);
        }}
      />
      <EuiForm>
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
              <EuiLink href={documentationLinks.watcher.putWatchApi} target="_blank">
                {i18n.translate('xpack.watcher.sections.watchEdit.json.form.watchJsonDocLink', {
                  defaultMessage: 'Syntax',
                })}
              </EuiLink>
              )
            </Fragment>
          }
          errorKey="json"
          isShowingErrors={hasErrors}
          fullWidth
          errors={errors}
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
              setWatchProperty('watchString', json);
            }}
          />
        </ErrableFormRow>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              type="submit"
              isDisabled={hasErrors}
              onClick={async () => {
                const savedWatch = await onWatchSave(watch, licenseService);
                if (savedWatch && savedWatch.error) {
                  return setModal(savedWatch.error);
                }
              }}
            >
              {i18n.translate('xpack.watcher.sections.watchEdit.json.saveButtonLabel', {
                defaultMessage: 'Save',
              })}
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
