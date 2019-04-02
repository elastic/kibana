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
import { JsonWatch } from 'plugins/watcher/models/watch/json_watch';
import { ErrableFormRow } from '../../../components/form_errors';
import { documentationLinks } from '../../../lib/documentation_links';
import { onWatchSave } from '../json_watch_edit_actions';
import { WatchContext } from './watch_context';

const JSON_WATCH_IDS = {
  ID: 'watchId',
  NAME: 'watchName',
  JSON: 'watchJson',
};

const JSON_WATCH_ERROR_MSGS = {
  [JSON_WATCH_IDS.JSON]: {
    invalid: i18n.translate('xpack.watcher.sections.watchEdit.json.error.invalidJsonText', {
      defaultMessage: 'Invalid JSON',
    }),
  },
  [JSON_WATCH_IDS.ID]: {
    invalid: i18n.translate('xpack.watcher.sections.watchEdit.json.error.invalidIdText', {
      defaultMessage: `ID must begin with a letter or underscore
      and contain only letters, underscores, dashes, and numbers.`,
    }),
    required: i18n.translate('xpack.watcher.sections.watchEdit.json.error.requiredIdText', {
      defaultMessage: 'ID is required',
    }),
  },
};

function validateId(id: string) {
  const regex = /[a-zA-Z_][a-zA-Z0-9_@\-\$\.]*/;
  if (!id) {
    return JSON_WATCH_ERROR_MSGS[JSON_WATCH_IDS.ID].required;
  } else if (!regex.test(id)) {
    return JSON_WATCH_ERROR_MSGS[JSON_WATCH_IDS.ID].invalid;
  }
  return false;
}

const ERRORS = {
  [JSON_WATCH_IDS.JSON]: [],
  [JSON_WATCH_IDS.ID]: [],
};

export const JsonWatchEditForm = ({
  kbnUrl,
  licenseService,
  setModal,
}: {
  kbnUrl: any;
  licenseService: any;
  setModal: (
    options: {
      message: string;
    }
  ) => void;
}) => {
  const { watch, setWatch } = useContext(WatchContext);
  // hooks
  const [errors, setErrors] = useState<{ [key: string]: string[] }>(ERRORS);
  const [isShowingErrors, setIsShowingErrors] = useState<boolean>(false);
  // ace editor requires json to be in string format
  const [watchJsonString, setWatchJsonString] = useState<string>(
    JSON.stringify(watch.watch, null, 2)
  );
  return (
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
            setErrors({ ...errors, [JSON_WATCH_IDS.ID]: error ? [error] : [] });
            setIsShowingErrors(!!error);
            setWatch(new JsonWatch({ ...watch, id }));
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
            setWatch(new JsonWatch({ ...watch, name: e.target.value }));
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
          onValidate={(annotations: any) => {
            const hasError = annotations.find((annotation: any) => annotation.type === 'error');
            if (hasError || watchJsonString === '') {
              setErrors({
                ...errors,
                [JSON_WATCH_IDS.JSON]: [JSON_WATCH_ERROR_MSGS[JSON_WATCH_IDS.JSON].invalid],
              });
              setIsShowingErrors(true);
              return;
            }
            setWatch(
              new JsonWatch({
                ...watch,
                watch: JSON.parse(watchJsonString),
              })
            );
            setErrors({ ...errors, [JSON_WATCH_IDS.ID]: [] });
            setIsShowingErrors(false);
          }}
          onChange={(json: string) => {
            setWatchJsonString(json);
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
                const savedWatch = await onWatchSave(watch, kbnUrl, licenseService);
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
  );
};
