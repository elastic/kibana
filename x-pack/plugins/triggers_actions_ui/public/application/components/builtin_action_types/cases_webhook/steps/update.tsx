/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FIELD_TYPES, UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import {
  containsCommentsOrEmpty,
  containsExternalId,
  containsIdOrEmpty,
  containsTitleAndDesc,
  isUrlButCanBeEmpty,
} from '../validator';
import { MustacheTextFieldWrapper } from '../../../mustache_text_field_wrapper';
import { casesVars, commentVars, urlVars } from '../action_variables';
import { JsonFieldWrapper } from '../../../json_field_wrapper';
import { HTTP_VERBS } from '../webhook_connectors';
import * as i18n from '../translations';
const { emptyField, urlField } = fieldValidators;

interface Props {
  display: boolean;
  readOnly: boolean;
}

export const UpdateStep: FunctionComponent<Props> = ({ display, readOnly }) => (
  <span data-test-subj="updateStep" style={{ display: display ? 'block' : 'none' }}>
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <UseField
          path="config.updateIncidentMethod"
          component={Field}
          config={{
            label: i18n.UPDATE_INCIDENT_METHOD,
            defaultValue: 'put',
            type: FIELD_TYPES.SELECT,
            validations: [
              {
                validator: emptyField(i18n.UPDATE_METHOD_REQUIRED),
              },
            ],
          }}
          componentProps={{
            euiFieldProps: {
              'data-test-subj': 'webhookUpdateMethodSelect',
              options: HTTP_VERBS.map((verb) => ({ text: verb.toUpperCase(), value: verb })),
              readOnly,
            },
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <UseField
          path="config.updateIncidentUrl"
          config={{
            label: i18n.UPDATE_INCIDENT_URL,
            validations: [
              {
                validator: urlField(i18n.UPDATE_URL_REQUIRED),
              },
              { validator: containsExternalId() },
            ],
            helpText: i18n.UPDATE_INCIDENT_URL_HELP,
          }}
          component={MustacheTextFieldWrapper}
          componentProps={{
            euiFieldProps: {
              readOnly,
              'data-test-subj': 'webhookUpdateUrlText',
              messageVariables: urlVars,
              paramsProperty: 'updateIncidentUrl',
              buttonTitle: i18n.ADD_CASES_VARIABLE,
              showButtonTitle: true,
            },
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiFlexGroup>
      <EuiFlexItem>
        <UseField
          path="config.updateIncidentJson"
          config={{
            helpText: i18n.UPDATE_INCIDENT_JSON_HELP,
            label: i18n.UPDATE_INCIDENT_JSON,
            validations: [
              {
                validator: emptyField(i18n.UPDATE_INCIDENT_REQUIRED),
              },
              {
                validator: containsTitleAndDesc(),
              },
            ],
          }}
          component={JsonFieldWrapper}
          componentProps={{
            euiCodeEditorProps: {
              height: '200px',
              isReadOnly: readOnly,
              'data-test-subj': 'webhookUpdateIncidentJson',
              ['aria-label']: i18n.CODE_EDITOR,
            },
            messageVariables: casesVars,
            paramsProperty: 'updateIncidentJson',
            buttonTitle: i18n.ADD_CASES_VARIABLE,
            showButtonTitle: true,
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <UseField
          path="config.createCommentMethod"
          component={Field}
          config={{
            label: i18n.CREATE_COMMENT_METHOD,
            defaultValue: 'put',
            type: FIELD_TYPES.SELECT,
            validations: [
              {
                validator: emptyField(i18n.CREATE_COMMENT_METHOD_REQUIRED),
              },
            ],
          }}
          componentProps={{
            euiFieldProps: {
              'data-test-subj': 'webhookCreateCommentMethodSelect',
              options: HTTP_VERBS.map((verb) => ({ text: verb.toUpperCase(), value: verb })),
              readOnly,
            },
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <UseField
          path="config.createCommentUrl"
          config={{
            label: i18n.CREATE_COMMENT_URL,
            validations: [
              {
                validator: isUrlButCanBeEmpty(i18n.CREATE_COMMENT_URL_REQUIRED),
              },
              { validator: containsIdOrEmpty(i18n.CREATE_COMMENT_URL_REQUIRED) },
            ],
            helpText: i18n.CREATE_COMMENT_URL_HELP,
          }}
          component={MustacheTextFieldWrapper}
          componentProps={{
            euiFieldProps: {
              readOnly,
              'data-test-subj': 'webhookCreateCommentUrlText',
              messageVariables: urlVars,
              paramsProperty: 'createCommentUrl',
              buttonTitle: i18n.ADD_CASES_VARIABLE,
              showButtonTitle: true,
            },
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiFlexGroup>
      <EuiFlexItem>
        <UseField
          path="config.createCommentJson"
          config={{
            helpText: i18n.CREATE_COMMENT_JSON_HELP,
            label: i18n.CREATE_COMMENT_JSON,
            validations: [
              {
                validator: containsCommentsOrEmpty(i18n.CREATE_COMMENT_MESSAGE),
              },
            ],
          }}
          component={JsonFieldWrapper}
          componentProps={{
            euiCodeEditorProps: {
              height: '200px',
              isReadOnly: readOnly,
              'data-test-subj': 'webhookCreateCommentJson',
              ['aria-label']: i18n.CODE_EDITOR,
            },
            messageVariables: commentVars,
            paramsProperty: 'createCommentJson',
            buttonTitle: i18n.ADD_CASES_VARIABLE,
            showButtonTitle: true,
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  </span>
);
