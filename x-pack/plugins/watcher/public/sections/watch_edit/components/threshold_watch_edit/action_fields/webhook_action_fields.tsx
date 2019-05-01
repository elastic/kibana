/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useEffect } from 'react';

import { EuiCodeEditor, EuiFieldNumber, EuiFieldText, EuiFormRow, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ErrableFormRow } from '../../../../../components/form_errors';
import { WebhookAction } from '../../../../../../common/types/action_types';

interface Props {
  action: WebhookAction;
  editAction: (changedProperty: { key: string; value: any }) => void;
  errors: { [key: string]: string[] };
  hasErrors: boolean;
}

const HTTP_VERBS = ['head', 'get', 'post', 'put', 'delete'];

export const WebhookActionFields: React.FunctionComponent<Props> = ({
  action,
  editAction,
  errors,
  hasErrors,
}) => {
  const { method, host, port, path, body } = action;

  useEffect(() => {
    editAction({ key: 'contentType', value: 'application/json' }); // set content-type for threshold watch to json by default
  }, []);

  return (
    <Fragment>
      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.watcher.sections.watchEdit.threshold.webhookAction.methodFieldLabel',
          {
            defaultMessage: 'Method',
          }
        )}
      >
        <EuiSelect
          fullWidth
          name="method"
          value={method || 'get'}
          options={HTTP_VERBS.map(verb => ({ text: verb.toUpperCase(), value: verb }))}
          onChange={e => {
            editAction({ key: 'method', value: e.target.value });
          }}
        />
      </EuiFormRow>

      <ErrableFormRow
        id="webhookHost"
        errorKey="host"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors && host !== undefined}
        label={i18n.translate(
          'xpack.watcher.sections.watchEdit.threshold.webhookAction.hostFieldLabel',
          {
            defaultMessage: 'Host',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="host"
          value={host || ''}
          onChange={e => {
            editAction({ key: 'host', value: e.target.value });
          }}
          onBlur={() => {
            if (!host) {
              editAction({ key: 'host', value: '' });
            }
          }}
        />
      </ErrableFormRow>

      <ErrableFormRow
        id="webhookPort"
        errorKey="port"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors && port !== undefined}
        label={i18n.translate(
          'xpack.watcher.sections.watchEdit.threshold.webhookAction.methodPortLabel',
          {
            defaultMessage: 'Port',
          }
        )}
      >
        <EuiFieldNumber
          fullWidth
          name="port"
          value={port || ''}
          onChange={e => {
            editAction({ key: 'port', value: parseInt(e.target.value, 10) });
          }}
          onBlur={() => {
            if (!port) {
              editAction({ key: 'port', value: '' });
            }
          }}
        />
      </ErrableFormRow>

      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.watcher.sections.watchEdit.threshold.webhookAction.pathFieldLabel',
          {
            defaultMessage: 'Path',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="path"
          value={path || ''}
          onChange={e => {
            editAction({ key: 'path', value: e.target.value });
          }}
        />
      </EuiFormRow>

      <ErrableFormRow
        id="webhookBody"
        label={i18n.translate(
          'xpack.watcher.sections.watchEdit.threshold.webhookAction.bodyFieldLabel',
          {
            defaultMessage: 'Body',
          }
        )}
        errorKey="body"
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
            'xpack.watcher.sections.watchEdit.threshold.webhookAction.bodyCodeEditorAriaLabel',
            {
              defaultMessage: 'Code editor',
            }
          )}
          value={body || ''}
          onChange={(json: string) => {
            editAction({ key: 'body', value: json });
          }}
        />
      </ErrableFormRow>
    </Fragment>
  );
};
