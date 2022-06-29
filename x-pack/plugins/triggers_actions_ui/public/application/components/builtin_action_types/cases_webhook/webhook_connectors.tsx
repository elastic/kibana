/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import {
  FIELD_TYPES,
  UseArray,
  UseField,
  useFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field, TextField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { ActionVariable } from '@kbn/alerting-plugin/common';
import { JsonFieldWrapper } from '../../json_field_wrapper';
import { PasswordField } from '../../password_field';
import { ActionConnectorFieldsProps } from '../../../../types';
import * as i18n from './translations';
const { emptyField, urlField } = fieldValidators;

const HTTP_VERBS = ['post', 'put', 'patch'];

const casesVars: ActionVariable[] = [
  { name: 'case.title', description: 'test title', useWithTripleBracesInTemplates: true },
  {
    name: 'case.description',
    description: 'test description',
    useWithTripleBracesInTemplates: true,
  },
  { name: 'case.tags', description: 'test tags', useWithTripleBracesInTemplates: true },
];

const commentVars: ActionVariable[] = [
  { name: 'case.comment', description: 'test comment', useWithTripleBracesInTemplates: true },
];

const CasesWebhookActionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
}) => {
  const { getFieldDefaultValue } = useFormContext();
  const [{ config, __internal__ }] = useFormData({
    watch: ['config.hasAuth', '__internal__.hasHeaders'],
  });

  const hasHeadersDefaultValue = !!getFieldDefaultValue<boolean | undefined>('config.headers');

  const hasAuth = config == null ? true : config.hasAuth;
  const hasHeaders = __internal__ != null ? __internal__.hasHeaders : false;

  return (
    <>
      {/* start CREATE INCIDENT INPUTS */}
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
              ],
              // type: FIELD_TYPES.JSON,
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
      {/* end CREATE INCIDENT INPUTS */}
      {/* start GET INCIDENT INPUTS */}
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
              ],
              helpText: i18n.GET_INCIDENT_URL_HELP,
            }}
            component={Field}
            componentProps={{
              euiFieldProps: {
                readOnly,
                'data-test-subj': 'webhookGetUrlText',
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
            path="config.getIncidentResponseCreatedDateKey"
            config={{
              label: i18n.GET_INCIDENT_CREATED_KEY,
              validations: [
                {
                  validator: emptyField(i18n.GET_RESPONSE_EXTERNAL_CREATED_KEY_REQUIRED),
                },
              ],
              helpText: i18n.GET_INCIDENT_CREATED_KEY_HELP,
            }}
            component={Field}
            componentProps={{
              euiFieldProps: {
                readOnly,
                'data-test-subj': 'getIncidentResponseCreatedDateKeyText',
              },
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <UseField
            path="config.getIncidentResponseUpdatedDateKey"
            config={{
              label: i18n.GET_INCIDENT_UPDATED_KEY,
              validations: [
                {
                  validator: emptyField(i18n.GET_RESPONSE_EXTERNAL_UPDATED_KEY_REQUIRED),
                },
              ],
              helpText: i18n.GET_INCIDENT_UPDATED_KEY_HELP,
            }}
            component={Field}
            componentProps={{
              euiFieldProps: {
                readOnly,
                'data-test-subj': 'getIncidentResponseUpdatedDateKeyText',
              },
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <UseField
            path="config.incidentViewUrl"
            config={{
              label: i18n.EXTERNAL_INCIDENT_VIEW_URL,
              validations: [
                {
                  validator: urlField(i18n.GET_INCIDENT_VIEW_URL_REQUIRED),
                },
              ],
              helpText: i18n.EXTERNAL_INCIDENT_VIEW_URL_HELP,
            }}
            component={Field}
            componentProps={{
              euiFieldProps: {
                readOnly,
                'data-test-subj': 'incidentViewUrlText',
              },
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {/* end GET INCIDENT INPUTS */}
      {/* start UPDATE INCIDENT INPUTS */}
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
              ],
              helpText: i18n.UPDATE_INCIDENT_URL_HELP,
            }}
            component={Field}
            componentProps={{
              euiFieldProps: {
                readOnly,
                'data-test-subj': 'webhookUpdateUrlText',
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
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {/* end UPDATE INCIDENT INPUTS */}
      {/* start CREATE COMMENT INCIDENT INPUTS */}
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
                  validator: urlField(i18n.CREATE_COMMENT_URL_REQUIRED),
                },
              ],
              helpText: i18n.CREATE_COMMENT_URL_HELP,
            }}
            component={Field}
            componentProps={{
              euiFieldProps: {
                readOnly,
                'data-test-subj': 'webhookCreateCommentUrlText',
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
                  validator: emptyField(i18n.CREATE_COMMENT_REQUIRED),
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
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {/* end CREATE COMMENT INCIDENT INPUTS */}
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>{i18n.AUTH_TITLE}</h4>
          </EuiTitle>
          <EuiSpacer size="m" />
          <UseField
            path="config.hasAuth"
            component={Field}
            config={{ defaultValue: true, type: FIELD_TYPES.TOGGLE }}
            componentProps={{
              euiFieldProps: {
                label: i18n.HAS_AUTH,
                disabled: readOnly,
              },
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {hasAuth ? (
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
            <UseField
              path="secrets.user"
              config={{
                label: i18n.USERNAME,
                validations: [
                  {
                    validator: emptyField(i18n.USERNAME_REQUIRED),
                  },
                ],
              }}
              component={Field}
              componentProps={{
                euiFieldProps: { readOnly, 'data-test-subj': 'webhookUserInput', fullWidth: true },
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <PasswordField
              path="secrets.password"
              label={i18n.PASSWORD}
              readOnly={readOnly}
              data-test-subj="webhookPasswordInput"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}
      <EuiSpacer size="m" />
      <UseField
        path="__internal__.hasHeaders"
        component={Field}
        config={{
          defaultValue: hasHeadersDefaultValue,
          label: i18n.HEADERS_SWITCH,
          type: FIELD_TYPES.TOGGLE,
        }}
        componentProps={{
          euiFieldProps: {
            disabled: readOnly,
            'data-test-subj': 'webhookViewHeadersSwitch',
          },
        }}
      />
      <EuiSpacer size="m" />
      {hasHeaders ? (
        <UseArray path="config.headers" initialNumberOfItems={1}>
          {({ items, addItem, removeItem }) => {
            return (
              <>
                <EuiTitle size="xxs" data-test-subj="webhookHeaderText">
                  <h5>{i18n.HEADERS_TITLE}</h5>
                </EuiTitle>
                <EuiSpacer size="s" />
                {items.map((item) => (
                  <EuiFlexGroup key={item.id} data-test-subj="gobblegobble">
                    <EuiFlexItem>
                      <UseField
                        path={`${item.path}.key`}
                        config={{
                          label: i18n.KEY_LABEL,
                        }}
                        component={TextField}
                        // This is needed because when you delete
                        // a row and add a new one, the stale values will appear
                        readDefaultValueOnForm={!item.isNew}
                        componentProps={{
                          euiFieldProps: { readOnly, ['data-test-subj']: 'webhookHeadersKeyInput' },
                        }}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <UseField
                        path={`${item.path}.value`}
                        config={{ label: i18n.VALUE_LABEL }}
                        component={TextField}
                        readDefaultValueOnForm={!item.isNew}
                        componentProps={{
                          euiFieldProps: {
                            readOnly,
                            ['data-test-subj']: 'webhookHeadersValueInput',
                          },
                        }}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        color="danger"
                        onClick={() => removeItem(item.id)}
                        iconType="minusInCircle"
                        aria-label={i18n.DELETE_BUTTON}
                        style={{ marginTop: '28px' }}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ))}
                <EuiSpacer size="m" />
                <EuiButtonEmpty
                  iconType="plusInCircle"
                  onClick={addItem}
                  data-test-subj="webhookAddHeaderButton"
                >
                  {i18n.ADD_BUTTON}
                </EuiButtonEmpty>
                <EuiSpacer />
              </>
            );
          }}
        </UseArray>
      ) : null}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { CasesWebhookActionConnectorFields as default };
