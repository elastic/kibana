/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState, useMemo } from 'react';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiSwitch } from '@elastic/eui';
import {
  FIELD_TYPES,
  UseField,
  useFormContext,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { JsonFieldWrapper, MustacheTextFieldWrapper } from '@kbn/triggers-actions-ui-plugin/public';
import {
  containsCommentsOrEmpty,
  containsTitleAndDesc,
  isUrlButCanBeEmpty,
  validateCreateComment,
} from '../validator';
import { casesVars, commentVars, urlVars } from '../action_variables';
import { HTTP_VERBS } from '../webhook_connectors';
import { styles } from './update.styles';
import * as i18n from '../translations';
const { emptyField, urlField } = fieldValidators;

interface Props {
  display: boolean;
  readOnly: boolean;
}

export const UpdateStep: FunctionComponent<Props> = ({ display, readOnly }) => {
  const { getFieldDefaultValue } = useFormContext();

  const hasCommentDefaultValue =
    !!getFieldDefaultValue<boolean | undefined>('config.createCommentUrl') ||
    !!getFieldDefaultValue<boolean | undefined>('config.createCommentJson');

  const [isAddCommentToggled, setIsAddCommentToggled] = useState(Boolean(hasCommentDefaultValue));

  const onAddCommentToggle = () => {
    setIsAddCommentToggled((prev) => !prev);
  };

  const updateIncidentMethodConfig = useMemo(
    () => ({
      label: i18n.UPDATE_INCIDENT_METHOD,
      defaultValue: 'put',
      type: FIELD_TYPES.SELECT,
      validations: [{ validator: emptyField(i18n.UPDATE_METHOD_REQUIRED) }],
    }),
    []
  );

  const updateIncidentUrlConfig = useMemo(
    () => ({
      label: i18n.UPDATE_INCIDENT_URL,
      validations: [{ validator: urlField(i18n.UPDATE_URL_REQUIRED) }],
      helpText: i18n.UPDATE_INCIDENT_URL_HELP,
    }),
    []
  );

  const updateIncidentJsonConfig = useMemo(
    () => ({
      label: i18n.UPDATE_INCIDENT_JSON,
      helpText: i18n.UPDATE_INCIDENT_JSON_HELP,
      validations: [
        { validator: emptyField(i18n.UPDATE_INCIDENT_REQUIRED) },
        { validator: containsTitleAndDesc() },
      ],
    }),
    []
  );

  const createCommentMethodConfig = useMemo(
    () => ({
      label: i18n.CREATE_COMMENT_METHOD,
      defaultValue: 'put',
      type: FIELD_TYPES.SELECT,
      validations: [{ validator: emptyField(i18n.CREATE_COMMENT_METHOD_REQUIRED) }],
    }),
    []
  );

  const createCommentUrlConfig = useMemo(
    () => ({
      label: i18n.CREATE_COMMENT_URL,
      fieldsToValidateOnChange: ['config.createCommentUrl', 'config.createCommentJson'],
      validations: [
        { validator: isUrlButCanBeEmpty(i18n.CREATE_COMMENT_URL_FORMAT_REQUIRED) },
        {
          validator: validateCreateComment(
            i18n.CREATE_COMMENT_URL_MISSING,
            'config.createCommentJson'
          ),
        },
      ],
      helpText: i18n.CREATE_COMMENT_URL_HELP,
    }),
    []
  );

  const createCommentJsonConfig = useMemo(
    () => ({
      label: i18n.CREATE_COMMENT_JSON,
      helpText: i18n.CREATE_COMMENT_JSON_HELP,
      fieldsToValidateOnChange: ['config.createCommentJson', 'config.createCommentUrl'],
      validations: [
        { validator: containsCommentsOrEmpty(i18n.CREATE_COMMENT_FORMAT_MESSAGE) },
        {
          validator: validateCreateComment(
            i18n.CREATE_COMMENT_JSON_MISSING,
            'config.createCommentUrl'
          ),
        },
      ],
    }),
    []
  );

  return (
    <>
      <span data-test-subj="updateStep" style={{ display: display ? 'block' : 'none' }}>
        <EuiText>
          <h3>{i18n.STEP_4A}</h3>
          <small>
            <p>{i18n.STEP_4A_DESCRIPTION}</p>
          </small>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <UseField
              path="config.updateIncidentMethod"
              component={Field}
              config={updateIncidentMethodConfig}
              css={styles.method}
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
              config={updateIncidentUrlConfig}
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
              config={updateIncidentJsonConfig}
              component={JsonFieldWrapper}
              componentProps={{
                euiCodeEditorProps: {
                  height: '200px',
                  isReadOnly: readOnly,
                  ['aria-label']: i18n.CODE_EDITOR,
                },
                dataTestSubj: 'webhookUpdateIncidentJson',
                messageVariables: [...casesVars, ...urlVars],
                paramsProperty: 'updateIncidentJson',
                buttonTitle: i18n.ADD_CASES_VARIABLE,
                showButtonTitle: true,
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiSwitch
          label={i18n.STEP_4B}
          showLabel={true}
          onChange={onAddCommentToggle}
          checked={isAddCommentToggled}
          data-test-subj="webhookAddCommentToggle"
        />
        {isAddCommentToggled && (
          <>
            <EuiSpacer size="m" />
            <EuiText>
              <small>
                <p>{i18n.STEP_4B_DESCRIPTION}</p>
              </small>
            </EuiText>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <UseField
                  path="config.createCommentMethod"
                  component={Field}
                  config={createCommentMethodConfig}
                  css={styles.method}
                  componentProps={{
                    euiFieldProps: {
                      'data-test-subj': 'webhookCreateCommentMethodSelect',
                      options: HTTP_VERBS.map((verb) => ({
                        text: verb.toUpperCase(),
                        value: verb,
                      })),
                      readOnly,
                    },
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <UseField
                  path="config.createCommentUrl"
                  config={createCommentUrlConfig}
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
                  config={createCommentJsonConfig}
                  component={JsonFieldWrapper}
                  componentProps={{
                    euiCodeEditorProps: {
                      height: '200px',
                      isReadOnly: readOnly,
                      ['aria-label']: i18n.CODE_EDITOR,
                    },
                    dataTestSubj: 'webhookCreateCommentJson',
                    messageVariables: [...commentVars, ...urlVars],
                    paramsProperty: 'createCommentJson',
                    buttonTitle: i18n.ADD_CASES_VARIABLE,
                    showButtonTitle: true,
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </span>
    </>
  );
};
