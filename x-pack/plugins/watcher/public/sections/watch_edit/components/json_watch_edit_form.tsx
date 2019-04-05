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
import { ACTION_TYPES } from 'x-pack/plugins/watcher/common/constants';
import { ConfirmWatchesModal } from '../../../components/confirm_watches_modal';
import { ErrableFormRow } from '../../../components/form_errors';
import { documentationLinks } from '../../../lib/documentation_links';
import { onWatchSave, saveWatch } from '../watch_edit_actions';
import { WatchContext } from './watch_context';

const JSON_WATCH_IDS = {
  ID: 'watchId',
  NAME: 'watchName',
  JSON: 'watchJson',
};

function validateId(id: string) {
  const regex = /^[A-Za-z0-9\-\_]+$/;
  if (!id) {
    return i18n.translate('xpack.watcher.sections.watchEdit.json.error.requiredIdText', {
      defaultMessage: 'ID is required',
    });
  } else if (!regex.test(id)) {
    return i18n.translate('xpack.watcher.sections.watchEdit.json.error.invalidIdText', {
      defaultMessage: 'ID can only contain letters, underscores, dashes, and numbers.',
    });
  }
  return false;
}

function validateActions(actions: { [key: string]: any }) {
  const invalidActions = Object.keys(actions).find((actionKey: string) => {
    const actionKeys = Object.keys(actions[actionKey]);
    let type;
    Object.keys(ACTION_TYPES).forEach((k: string) => {
      if (actionKeys.includes(ACTION_TYPES[k]) && !actionKeys.includes(ACTION_TYPES.UNKNOWN)) {
        type = ACTION_TYPES[k];
      }
    });
    return !type;
  });
  if (invalidActions) {
    return i18n.translate('xpack.watcher.sections.watchEdit.json.error.invalidActionType', {
      defaultMessage: 'Unknown action type provided for action "{action}".',
      values: {
        action: invalidActions,
      },
    });
  }
  return false;
}

export const JsonWatchEditForm = ({
  urlService,
  licenseService,
  watchJsonString,
  setWatchJsonString,
  errors,
  setErrors,
  isShowingErrors,
  setIsShowingErrors,
}: {
  urlService: any;
  licenseService: any;
  watchJsonString: string;
  setWatchJsonString: (json: string) => void;
  errors: { [key: string]: string[] };
  setErrors: (errors: { [key: string]: string[] }) => void;
  isShowingErrors: boolean;
  setIsShowingErrors: (isShowingErrors: boolean) => void;
}) => {
  const { watch, setWatchProperty } = useContext(WatchContext);
  // hooks
  const [modal, setModal] = useState<{ title: string; message: string } | null>(null);
  return (
    <Fragment>
      <ConfirmWatchesModal
        modalOptions={modal}
        callback={async isConfirmed => {
          if (isConfirmed) {
            saveWatch(watch, urlService, licenseService);
          }
          setModal(null);
        }}
      />
      <EuiForm>
        <ErrableFormRow
          id={JSON_WATCH_IDS.ID}
          label={i18n.translate('xpack.watcher.sections.watchEdit.json.form.watchIDLabel', {
            defaultMessage: 'ID',
          })}
          errorKey={JSON_WATCH_IDS.ID}
          isShowingErrors={isShowingErrors}
          errors={errors}
          fullWidth
        >
          <EuiFieldText
            fullWidth
            name="id"
            value={watch.id}
            readOnly={!watch.isNew}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const id = e.target.value;
              const error = validateId(id);
              const newErrors = { ...errors, [JSON_WATCH_IDS.ID]: error ? [error] : [] };
              const isInvalidForm = !!Object.keys(newErrors).find(
                errorKey => newErrors[errorKey].length >= 1
              );
              setErrors(newErrors);
              setIsShowingErrors(isInvalidForm);
              setWatchProperty('id', id);
            }}
          />
        </ErrableFormRow>
        <EuiFormRow
          id={JSON_WATCH_IDS.NAME}
          label={i18n.translate('xpack.watcher.sections.watchEdit.json.form.watchNameLabel', {
            defaultMessage: 'Name',
          })}
          fullWidth
        >
          <EuiFieldText
            fullWidth
            name="name"
            value={watch.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setWatchProperty('name', e.target.value);
            }}
          />
        </EuiFormRow>
        <ErrableFormRow
          id={JSON_WATCH_IDS.JSON}
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
          errorKey={JSON_WATCH_IDS.JSON}
          isShowingErrors={isShowingErrors}
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
            value={watchJsonString}
            onChange={(json: string) => {
              setWatchJsonString(json);
              try {
                const watchJson = JSON.parse(json);
                if (watchJson && typeof watchJson === 'object') {
                  if (watchJson.actions) {
                    const actionsError = validateActions(watchJson.actions);
                    if (actionsError) {
                      setErrors({
                        ...errors,
                        [JSON_WATCH_IDS.JSON]: [actionsError],
                      });
                      setIsShowingErrors(true);
                      return;
                    }
                  }
                  setWatchProperty('watch', watchJson);
                  const newErrors = { ...errors, [JSON_WATCH_IDS.JSON]: [] };
                  const isInvalidForm = !!Object.keys(newErrors).find(
                    errorKey => newErrors[errorKey].length >= 1
                  );
                  setErrors(newErrors);
                  setIsShowingErrors(isInvalidForm);
                }
              } catch (e) {
                setErrors({
                  ...errors,
                  [JSON_WATCH_IDS.JSON]: [
                    i18n.translate('xpack.watcher.sections.watchEdit.json.error.invalidJsonText', {
                      defaultMessage: 'Invalid JSON',
                    }),
                  ],
                });
                setIsShowingErrors(true);
              }
            }}
          />
        </ErrableFormRow>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              type="submit"
              isDisabled={isShowingErrors}
              onClick={async () => {
                const error = validateId(watch.id);
                setErrors({ ...errors, [JSON_WATCH_IDS.ID]: error ? [error] : [] });
                setIsShowingErrors(!!error);
                if (!error) {
                  const savedWatch = await onWatchSave(watch, urlService, licenseService);
                  if (savedWatch && savedWatch.error) {
                    return setModal(savedWatch.error);
                  }
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
