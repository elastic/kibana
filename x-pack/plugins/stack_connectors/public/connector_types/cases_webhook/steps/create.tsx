/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { FIELD_TYPES, UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { JsonFieldWrapper } from '@kbn/triggers-actions-ui-plugin/public';
import { containsTitleAndDesc } from '../validator';
import { casesVars } from '../action_variables';
import { HTTP_VERBS } from '../webhook_connectors';
import * as i18n from '../translations';
const { emptyField, urlField } = fieldValidators;

interface Props {
  display: boolean;
  readOnly: boolean;
}

export const CreateStep: FunctionComponent<Props> = ({ display, readOnly }) => (
  <span data-test-subj="createStep" style={{ display: display ? 'block' : 'none' }}>
    <EuiText>
      <h3>{i18n.STEP_2}</h3>
      <small>
        <p>{i18n.STEP_2_DESCRIPTION}</p>
      </small>
    </EuiText>
    <EuiSpacer size="s" />
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <UseField
          path="config.createIncidentMethod"
          component={Field}
          config={{
            label: i18n.CREATE_INCIDENT_METHOD,
            defaultValue: 'post',
            type: FIELD_TYPES.SELECT,
            validations: [
              {
                validator: emptyField(i18n.CREATE_METHOD_REQUIRED),
              },
            ],
          }}
          componentProps={{
            euiFieldProps: {
              'data-test-subj': 'webhookCreateMethodSelect',
              options: HTTP_VERBS.map((verb) => ({ text: verb.toUpperCase(), value: verb })),
              readOnly,
            },
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <UseField
          path="config.createIncidentUrl"
          config={{
            label: i18n.CREATE_INCIDENT_URL,
            validations: [
              {
                validator: urlField(i18n.CREATE_URL_REQUIRED),
              },
            ],
          }}
          component={Field}
          componentProps={{
            euiFieldProps: {
              readOnly,
              'data-test-subj': 'webhookCreateUrlText',
            },
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiFlexGroup>
      <EuiFlexItem>
        <UseField
          path="config.createIncidentJson"
          config={{
            helpText: i18n.CREATE_INCIDENT_JSON_HELP,
            label: i18n.CREATE_INCIDENT_JSON,
            validations: [
              {
                validator: emptyField(i18n.CREATE_INCIDENT_REQUIRED),
              },
              {
                validator: containsTitleAndDesc(),
              },
            ],
          }}
          component={JsonFieldWrapper}
          componentProps={{
            euiCodeEditorProps: {
              isReadOnly: readOnly,
              'data-test-subj': 'webhookCreateIncidentJson',
              ['aria-label']: i18n.CODE_EDITOR,
            },
            messageVariables: casesVars,
            paramsProperty: 'createIncidentJson',
            buttonTitle: i18n.ADD_CASES_VARIABLE,
            showButtonTitle: true,
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiFlexGroup>
      <EuiFlexItem>
        <UseField
          path="config.createIncidentResponseKey"
          config={{
            helpText: i18n.CREATE_INCIDENT_RESPONSE_KEY_HELP,
            label: i18n.CREATE_INCIDENT_RESPONSE_KEY,
            validations: [
              {
                validator: emptyField(i18n.CREATE_RESPONSE_KEY_REQUIRED),
              },
            ],
          }}
          component={Field}
          componentProps={{
            euiFieldProps: {
              readOnly,
              'data-test-subj': 'createIncidentResponseKeyText',
            },
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  </span>
);
