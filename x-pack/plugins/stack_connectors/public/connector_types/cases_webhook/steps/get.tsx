/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { MustacheTextFieldWrapper } from '@kbn/triggers-actions-ui-plugin/public';
import { containsExternalId, containsExternalIdOrTitle } from '../validator';
import { urlVars, urlVarsExt } from '../action_variables';
import * as i18n from '../translations';
const { emptyField, urlField } = fieldValidators;

interface Props {
  display: boolean;
  readOnly: boolean;
}

export const GetStep: FunctionComponent<Props> = ({ display, readOnly }) => (
  <span data-test-subj="getStep" style={{ display: display ? 'block' : 'none' }}>
    <EuiText>
      <h3>{i18n.STEP_3}</h3>
      <small>
        <p>{i18n.STEP_3_DESCRIPTION}</p>
      </small>
    </EuiText>
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <UseField
          path="config.getIncidentUrl"
          config={{
            label: i18n.GET_INCIDENT_URL,
            validations: [
              {
                validator: urlField(i18n.GET_INCIDENT_URL_REQUIRED),
              },
              { validator: containsExternalId() },
            ],
            helpText: i18n.GET_INCIDENT_URL_HELP,
          }}
          component={MustacheTextFieldWrapper}
          componentProps={{
            euiFieldProps: {
              readOnly,
              'data-test-subj': 'webhookGetUrlText',
              messageVariables: urlVars,
              paramsProperty: 'getIncidentUrl',
              buttonTitle: i18n.ADD_CASES_VARIABLE,
              showButtonTitle: true,
            },
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <UseField
          path="config.getIncidentResponseExternalTitleKey"
          config={{
            label: i18n.GET_INCIDENT_TITLE_KEY,
            validations: [
              {
                validator: emptyField(i18n.GET_RESPONSE_EXTERNAL_TITLE_KEY_REQUIRED),
              },
            ],
            helpText: i18n.GET_INCIDENT_TITLE_KEY_HELP,
          }}
          component={Field}
          componentProps={{
            euiFieldProps: {
              readOnly,
              'data-test-subj': 'getIncidentResponseExternalTitleKeyText',
            },
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <UseField
          path="config.viewIncidentUrl"
          config={{
            label: i18n.EXTERNAL_INCIDENT_VIEW_URL,
            validations: [
              {
                validator: urlField(i18n.GET_INCIDENT_VIEW_URL_REQUIRED),
              },
              { validator: containsExternalIdOrTitle() },
            ],
            helpText: i18n.EXTERNAL_INCIDENT_VIEW_URL_HELP,
          }}
          component={MustacheTextFieldWrapper}
          componentProps={{
            euiFieldProps: {
              readOnly,
              'data-test-subj': 'viewIncidentUrlText',
              messageVariables: urlVarsExt,
              paramsProperty: 'viewIncidentUrl',
              buttonTitle: i18n.ADD_CASES_VARIABLE,
              showButtonTitle: true,
            },
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  </span>
);
