/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiFieldPassword,
  EuiFieldText,
  EuiFormRow,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiButtonIcon,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiTitle,
  EuiSwitch,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionConnectorFieldsProps } from '../../../../types';
import { CasesWebhookActionConnector, CasesWebhookConfig, CasesWebhookSecrets } from './types';
import { getEncryptedFieldNotifyLabel } from '../../get_encrypted_field_notify_label';
import { JsonEditorWithMessageVariables } from '../../json_editor_with_message_variables';

const HTTP_VERBS = ['post', 'put', 'patch'];

const CasesWebhookActionConnectorFields: React.FunctionComponent<
  ActionConnectorFieldsProps<CasesWebhookActionConnector>
> = ({ action, editActionConfig, editActionSecrets, errors, readOnly }) => {
  const { user, password } = action.secrets;
  const {
    createCommentJson,
    createCommentMethod,
    createCommentUrl,
    createIncidentJson,
    createIncidentMethod,
    createIncidentResponseKey,
    createIncidentUrl,
    getIncidentResponseCreatedDateKey,
    getIncidentResponseExternalTitleKey,
    getIncidentResponseUpdatedDateKey,
    incidentViewUrl,
    getIncidentUrl,
    hasAuth,
    headers,
    updateIncidentJson,
    updateIncidentMethod,
    updateIncidentUrl,
  } = action.config;

  const [httpHeaderKey, setHttpHeaderKey] = useState<string>('');
  const [httpHeaderValue, setHttpHeaderValue] = useState<string>('');
  const [hasHeaders, setHasHeaders] = useState<boolean>(false);

  useEffect(() => {
    if (!action.id) {
      editActionConfig('hasAuth', true);
    }

    if (!createIncidentMethod) {
      editActionConfig('createIncidentMethod', 'post'); // set createIncidentMethod to POST by default
    }

    if (!updateIncidentMethod) {
      editActionConfig('updateIncidentMethod', 'put'); // set updateIncidentMethod to PUT by default
    }

    if (!createCommentMethod) {
      editActionConfig('createCommentMethod', 'put'); // set createCommentMethod to PUT by default
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headerErrors = {
    keyHeader: new Array<string>(),
    valueHeader: new Array<string>(),
  };
  if (!httpHeaderKey && httpHeaderValue) {
    headerErrors.keyHeader.push(
      i18n.translate(
        'xpack.triggersActionsUI.sections.addAction.casesWebhookAction.error.requiredHeaderKeyText',
        {
          defaultMessage: 'Key is required.',
        }
      )
    );
  }
  if (httpHeaderKey && !httpHeaderValue) {
    headerErrors.valueHeader.push(
      i18n.translate(
        'xpack.triggersActionsUI.sections.addAction.casesWebhookAction.error.requiredHeaderValueText',
        {
          defaultMessage: 'Value is required.',
        }
      )
    );
  }
  const hasHeaderErrors: boolean =
    (headerErrors.keyHeader !== undefined &&
      headerErrors.valueHeader !== undefined &&
      headerErrors.keyHeader.length > 0) ||
    headerErrors.valueHeader.length > 0;

  function addHeader() {
    if (headers && !!Object.keys(headers).find((key) => key === httpHeaderKey)) {
      return;
    }
    const updatedHeaders = headers
      ? { ...headers, [httpHeaderKey]: httpHeaderValue }
      : { [httpHeaderKey]: httpHeaderValue };
    editActionConfig('headers', updatedHeaders);
    setHttpHeaderKey('');
    setHttpHeaderValue('');
  }

  function viewHeaders() {
    setHasHeaders(!hasHeaders);
    if (!hasHeaders && !headers) {
      editActionConfig('headers', {});
    }
  }

  function removeHeader(keyToRemove: string) {
    const updatedHeaders =
      headers != null
        ? Object.keys(headers)
            .filter((key) => key !== keyToRemove)
            .reduce((headerToRemove: Record<string, string>, key: string) => {
              headerToRemove[key] = headers[key];
              return headerToRemove;
            }, {})
        : {};
    editActionConfig('headers', updatedHeaders);
  }

  let headerControl;
  if (hasHeaders) {
    headerControl = (
      <>
        <EuiTitle size="xxs">
          <h5>
            <FormattedMessage
              defaultMessage="Add header"
              id="xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.addHeader"
            />
          </h5>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="s" alignItems="flexStart">
          <EuiFlexItem grow={false}>
            <EuiFormRow
              id="webhookHeaderKey"
              fullWidth
              error={headerErrors.keyHeader}
              isInvalid={hasHeaderErrors && httpHeaderKey !== undefined}
              label={i18n.translate(
                'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.keyTextFieldLabel',
                {
                  defaultMessage: 'Key',
                }
              )}
            >
              <EuiFieldText
                fullWidth
                isInvalid={hasHeaderErrors && httpHeaderKey !== undefined}
                name="keyHeader"
                readOnly={readOnly}
                value={httpHeaderKey}
                data-test-subj="webhookHeadersKeyInput"
                onChange={(e) => {
                  setHttpHeaderKey(e.target.value);
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow
              id="webhookHeaderValue"
              fullWidth
              error={headerErrors.valueHeader}
              isInvalid={hasHeaderErrors && httpHeaderValue !== undefined}
              label={i18n.translate(
                'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.valueTextFieldLabel',
                {
                  defaultMessage: 'Value',
                }
              )}
            >
              <EuiFieldText
                fullWidth
                isInvalid={hasHeaderErrors && httpHeaderValue !== undefined}
                name="valueHeader"
                readOnly={readOnly}
                value={httpHeaderValue}
                data-test-subj="webhookHeadersValueInput"
                onChange={(e) => {
                  setHttpHeaderValue(e.target.value);
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow hasEmptyLabelSpace>
              <EuiButtonEmpty
                isDisabled={hasHeaders && (hasHeaderErrors || !httpHeaderKey || !httpHeaderValue)}
                data-test-subj="webhookAddHeaderButton"
                onClick={addHeader}
              >
                <FormattedMessage
                  defaultMessage="Add"
                  id="xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.addHeaderButton"
                />
              </EuiButtonEmpty>
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }

  const headersList = Object.keys(headers || {}).map((key: string) => {
    return (
      <EuiFlexGroup key={key} data-test-subj="webhookHeaderText" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            aria-label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.deleteHeaderButton',
              {
                defaultMessage: 'Delete',
                description: 'Delete HTTP header',
              }
            )}
            iconType="trash"
            color="danger"
            onClick={() => removeHeader(key)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiDescriptionList compressed>
            <EuiDescriptionListTitle>{key}</EuiDescriptionListTitle>
            <EuiDescriptionListDescription>{headers && headers[key]}</EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  });
  const isConfigKeyValueInvalid = useCallback(
    (key: keyof CasesWebhookConfig): boolean =>
      errors[key] !== undefined && errors[key].length > 0 && action.config[key] !== undefined,
    [action.config, errors]
  );
  const isSecretsKeyValueInvalid = useCallback(
    (key: keyof CasesWebhookSecrets): boolean =>
      errors[key] !== undefined && errors[key].length > 0 && action.secrets[key] !== undefined,
    [action.secrets, errors]
  );

  return (
    <>
      {/* start CREATE INCIDENT INPUTS */}
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.createIncidentMethodTextFieldLabel',
              {
                defaultMessage: 'Create Incident Method',
              }
            )}
          >
            <EuiSelect
              name="createIncidentMethod"
              value={createIncidentMethod || 'post'}
              disabled={readOnly}
              data-test-subj="webhookCreateMethodSelect"
              options={HTTP_VERBS.map((verb) => ({ text: verb.toUpperCase(), value: verb }))}
              onChange={(e) => {
                editActionConfig('createIncidentMethod', e.target.value);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id="createIncidentUrl"
            fullWidth
            error={errors.createIncidentUrl}
            isInvalid={isConfigKeyValueInvalid('createIncidentUrl')}
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.createIncidentUrlTextFieldLabel',
              {
                defaultMessage: 'Create Incident URL',
              }
            )}
          >
            <EuiFieldText
              name="createIncidentUrl"
              isInvalid={isConfigKeyValueInvalid('createIncidentUrl')}
              fullWidth
              readOnly={readOnly}
              value={createIncidentUrl || ''}
              data-test-subj="webhookCreateUrlText"
              onChange={(e) => {
                editActionConfig('createIncidentUrl', e.target.value);
              }}
              onBlur={() => {
                if (!createIncidentUrl) {
                  editActionConfig('createIncidentUrl', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="createIncidentJson"
            fullWidth
            isInvalid={isConfigKeyValueInvalid('createIncidentJson')}
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.createIncidentJsonTextFieldLabel',
              {
                defaultMessage: 'Create Incident Object',
              }
            )}
            helpText={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.createIncidentJsonTextFieldLabel',
              {
                defaultMessage:
                  'JSON object to create incident. Sub $SUM where the summary/title should go, $DESC where the description should go, and $TAGS where tags should go (optional).',
              }
            )}
          >
            <JsonEditorWithMessageVariables
              inputTargetValue={createIncidentJson}
              paramsProperty={'createIncidentJson'}
              label={i18n.translate(
                'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.bodyFieldLabel',
                {
                  defaultMessage: 'JSON',
                }
              )}
              aria-label={i18n.translate(
                'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.bodyCodeEditorAriaLabel',
                {
                  defaultMessage: 'Code editor',
                }
              )}
              errors={errors.createIncidentJson as string[]}
              onDocumentsChange={(json: string) => {
                editActionConfig('createIncidentJson', json);
              }}
              onBlur={() => {
                if (!createIncidentJson) {
                  editActionConfig('createIncidentJson', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="createIncidentResponseKey"
            fullWidth
            error={errors.createIncidentResponseKey}
            isInvalid={isConfigKeyValueInvalid('createIncidentResponseKey')}
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.createIncidentResponseKeyTextFieldLabel',
              {
                defaultMessage: 'Create Incident Response Incident Key',
              }
            )}
            helpText={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.createIncidentResponseKeyTextFieldLabel',
              {
                defaultMessage:
                  'JSON key in create incident response that contains the external incident id',
              }
            )}
          >
            <EuiFieldText
              name="createIncidentResponseKey"
              isInvalid={isConfigKeyValueInvalid('createIncidentResponseKey')}
              fullWidth
              readOnly={readOnly}
              value={createIncidentResponseKey || ''}
              data-test-subj="createIncidentResponseKeyText"
              onChange={(e) => {
                editActionConfig('createIncidentResponseKey', e.target.value);
              }}
              onBlur={() => {
                if (!createIncidentResponseKey) {
                  editActionConfig('createIncidentResponseKey', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      {/* end CREATE INCIDENT INPUTS */}
      {/* start GET INCIDENT INPUTS */}
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFormRow
            id="getIncidentUrl"
            fullWidth
            error={errors.getIncidentUrl}
            isInvalid={isConfigKeyValueInvalid('getIncidentUrl')}
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.getIncidentUrlTextFieldLabel',
              {
                defaultMessage: 'Get Incident URL',
              }
            )}
            helpText={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.getIncidentUrlTextFieldLabel',
              {
                defaultMessage:
                  'API URL to GET incident details JSON from external system. Use $ID and Kibana will dynamically update the url with the external incident id.',
              }
            )}
          >
            <EuiFieldText
              name="getIncidentUrl"
              isInvalid={isConfigKeyValueInvalid('getIncidentUrl')}
              fullWidth
              readOnly={readOnly}
              value={getIncidentUrl || ''}
              data-test-subj="webhookCreateUrlText"
              onChange={(e) => {
                editActionConfig('getIncidentUrl', e.target.value);
              }}
              onBlur={() => {
                if (!getIncidentUrl) {
                  editActionConfig('getIncidentUrl', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id="getIncidentResponseExternalTitleKey"
            fullWidth
            error={errors.getIncidentResponseExternalTitleKey}
            isInvalid={isConfigKeyValueInvalid('getIncidentResponseExternalTitleKey')}
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.getIncidentResponseExternalTitleKeyTextFieldLabel',
              {
                defaultMessage: 'Get Incident Response External Title Key',
              }
            )}
            helpText={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.getIncidentResponseExternalTitleKeyTextFieldLabel',
              {
                defaultMessage:
                  'JSON key in get incident response that contains the external incident title',
              }
            )}
          >
            <EuiFieldText
              name="getIncidentResponseExternalTitleKey"
              isInvalid={isConfigKeyValueInvalid('getIncidentResponseExternalTitleKey')}
              fullWidth
              readOnly={readOnly}
              value={getIncidentResponseExternalTitleKey || ''}
              data-test-subj="getIncidentResponseExternalTitleKeyText"
              onChange={(e) => {
                editActionConfig('getIncidentResponseExternalTitleKey', e.target.value);
              }}
              onBlur={() => {
                if (!getIncidentResponseExternalTitleKey) {
                  editActionConfig('getIncidentResponseExternalTitleKey', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id="getIncidentResponseCreatedDateKey"
            fullWidth
            error={errors.getIncidentResponseCreatedDateKey}
            isInvalid={isConfigKeyValueInvalid('getIncidentResponseCreatedDateKey')}
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.getIncidentResponseCreatedDateKeyTextFieldLabel',
              {
                defaultMessage: 'Get Incident Response Created Date Key',
              }
            )}
            helpText={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.getIncidentResponseCreatedDateKeyTextFieldLabel',
              {
                defaultMessage:
                  'JSON key in get incident response that contains the date the incident was created.',
              }
            )}
          >
            <EuiFieldText
              name="getIncidentResponseCreatedDateKey"
              isInvalid={isConfigKeyValueInvalid('getIncidentResponseCreatedDateKey')}
              fullWidth
              readOnly={readOnly}
              value={getIncidentResponseCreatedDateKey || ''}
              data-test-subj="getIncidentResponseCreatedDateKeyText"
              onChange={(e) => {
                editActionConfig('getIncidentResponseCreatedDateKey', e.target.value);
              }}
              onBlur={() => {
                if (!getIncidentResponseCreatedDateKey) {
                  editActionConfig('getIncidentResponseCreatedDateKey', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id="getIncidentResponseUpdatedDateKey"
            fullWidth
            error={errors.getIncidentResponseUpdatedDateKey}
            isInvalid={isConfigKeyValueInvalid('getIncidentResponseUpdatedDateKey')}
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.getIncidentResponseUpdatedDateKeyTextFieldLabel',
              {
                defaultMessage: 'Get Incident Response Updated Date Key',
              }
            )}
            helpText={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.getIncidentResponseUpdatedDateKeyTextFieldLabel',
              {
                defaultMessage:
                  'JSON key in get incident response that contains the date the incident was updated.',
              }
            )}
          >
            <EuiFieldText
              name="getIncidentResponseUpdatedDateKey"
              isInvalid={isConfigKeyValueInvalid('getIncidentResponseUpdatedDateKey')}
              fullWidth
              readOnly={readOnly}
              value={getIncidentResponseUpdatedDateKey || ''}
              data-test-subj="getIncidentResponseUpdatedDateKeyText"
              onChange={(e) => {
                editActionConfig('getIncidentResponseUpdatedDateKey', e.target.value);
              }}
              onBlur={() => {
                if (!getIncidentResponseUpdatedDateKey) {
                  editActionConfig('getIncidentResponseUpdatedDateKey', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id="incidentViewUrl"
            fullWidth
            error={errors.incidentViewUrl}
            isInvalid={isConfigKeyValueInvalid('incidentViewUrl')}
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.incidentViewUrlTextFieldLabel',
              {
                defaultMessage: 'External Incident View URL',
              }
            )}
            helpText={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.incidentViewUrlTextFieldLabel',
              {
                defaultMessage:
                  'URL to view incident in external system. Use $ID or $TITLE and Kibana will dynamically update the url with the external incident id or external incident title.',
              }
            )}
          >
            <EuiFieldText
              name="incidentViewUrl"
              isInvalid={isConfigKeyValueInvalid('incidentViewUrl')}
              fullWidth
              readOnly={readOnly}
              value={incidentViewUrl || ''}
              data-test-subj="incidentViewUrlText"
              onChange={(e) => {
                editActionConfig('incidentViewUrl', e.target.value);
              }}
              onBlur={() => {
                if (!incidentViewUrl) {
                  editActionConfig('incidentViewUrl', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      {/* end GET INCIDENT INPUTS */}
      {/* start UPDATE INCIDENT INPUTS */}
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.updateIncidentMethodTextFieldLabel',
              {
                defaultMessage: 'Update Incident Method',
              }
            )}
          >
            <EuiSelect
              name="updateIncidentMethod"
              value={updateIncidentMethod || 'put'}
              disabled={readOnly}
              data-test-subj="webhookUpdateMethodSelect"
              options={HTTP_VERBS.map((verb) => ({ text: verb.toUpperCase(), value: verb }))}
              onChange={(e) => {
                editActionConfig('updateIncidentMethod', e.target.value);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id="updateIncidentUrl"
            fullWidth
            error={errors.updateIncidentUrl}
            isInvalid={isConfigKeyValueInvalid('updateIncidentUrl')}
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.updateIncidentUrlTextFieldLabel',
              {
                defaultMessage: 'Update Incident URL',
              }
            )}
            helpText={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.updateIncidentUrlTextFieldLabel',
              {
                defaultMessage:
                  'API URL to update incident. Use $ID and Kibana will dynamically update the url with the external incident id.',
              }
            )}
          >
            <EuiFieldText
              name="updateIncidentUrl"
              isInvalid={isConfigKeyValueInvalid('updateIncidentUrl')}
              fullWidth
              readOnly={readOnly}
              value={updateIncidentUrl || ''}
              data-test-subj="webhookUpdateUrlText"
              onChange={(e) => {
                editActionConfig('updateIncidentUrl', e.target.value);
              }}
              onBlur={() => {
                if (!updateIncidentUrl) {
                  editActionConfig('updateIncidentUrl', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="updateIncidentJson"
            fullWidth
            isInvalid={isConfigKeyValueInvalid('updateIncidentJson')}
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.updateIncidentJsonTextFieldLabel',
              {
                defaultMessage: 'Update Incident Object',
              }
            )}
            helpText={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.updateIncidentJsonTextFieldLabel',
              {
                defaultMessage:
                  'JSON object to update incident. Sub $SUM where the summary/title should go, $DESC where the description should go, and $TAGS where tags should go (optional).',
              }
            )}
          >
            <JsonEditorWithMessageVariables
              inputTargetValue={updateIncidentJson}
              paramsProperty={'updateIncidentJson'}
              label={i18n.translate(
                'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.bodyFieldLabel',
                {
                  defaultMessage: 'JSON',
                }
              )}
              aria-label={i18n.translate(
                'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.bodyCodeEditorAriaLabel',
                {
                  defaultMessage: 'Code editor',
                }
              )}
              errors={errors.updateIncidentJson as string[]}
              onDocumentsChange={(json: string) => {
                editActionConfig('updateIncidentJson', json);
              }}
              onBlur={() => {
                if (!updateIncidentJson) {
                  editActionConfig('updateIncidentJson', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      {/* end UPDATE INCIDENT INPUTS */}
      {/* start CREATE COMMENT INCIDENT INPUTS */}
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.createCommentMethodTextFieldLabel',
              {
                defaultMessage: 'Create Comment Method',
              }
            )}
          >
            <EuiSelect
              name="createCommentMethod"
              value={createCommentMethod || 'put'}
              disabled={readOnly}
              data-test-subj="webhookCreateCommentMethodSelect"
              options={HTTP_VERBS.map((verb) => ({ text: verb.toUpperCase(), value: verb }))}
              onChange={(e) => {
                editActionConfig('createCommentMethod', e.target.value);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id="createCommentUrl"
            fullWidth
            error={errors.createCommentUrl}
            isInvalid={isConfigKeyValueInvalid('createCommentUrl')}
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.createCommentUrlTextFieldLabel',
              {
                defaultMessage: 'Create Comment URL',
              }
            )}
            helpText={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.createCommentUrlTextFieldLabel',
              {
                defaultMessage:
                  'API URL to add comment to incident. Use $ID and Kibana will dynamically update the url with the external incident id.',
              }
            )}
          >
            <EuiFieldText
              name="createCommentUrl"
              isInvalid={isConfigKeyValueInvalid('createCommentUrl')}
              fullWidth
              readOnly={readOnly}
              value={createCommentUrl || ''}
              data-test-subj="webhookUpdateUrlText"
              onChange={(e) => {
                editActionConfig('createCommentUrl', e.target.value);
              }}
              onBlur={() => {
                if (!createCommentUrl) {
                  editActionConfig('createCommentUrl', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="createCommentJson"
            fullWidth
            isInvalid={isConfigKeyValueInvalid('createCommentJson')}
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.createCommentJsonTextFieldLabel',
              {
                defaultMessage: 'Create Comment Object',
              }
            )}
            helpText={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.createCommentJsonTextFieldLabel',
              {
                defaultMessage:
                  'JSON object to update incident. Sub $COMMENT where the comment should go',
              }
            )}
          >
            <JsonEditorWithMessageVariables
              inputTargetValue={createCommentJson}
              paramsProperty={'createCommentJson'}
              label={i18n.translate(
                'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.bodyFieldLabel',
                {
                  defaultMessage: 'JSON',
                }
              )}
              aria-label={i18n.translate(
                'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.bodyCodeEditorAriaLabel',
                {
                  defaultMessage: 'Code editor',
                }
              )}
              errors={errors.createCommentJson as string[]}
              onDocumentsChange={(json: string) => {
                editActionConfig('createCommentJson', json);
              }}
              onBlur={() => {
                if (!createCommentJson) {
                  editActionConfig('createCommentJson', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      {/* end CREATE COMMENT INCIDENT INPUTS */}
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiSpacer size="m" />
          <EuiTitle size="xxs">
            <h4>
              <FormattedMessage
                id="xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.authenticationLabel"
                defaultMessage="Authentication"
              />
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiSwitch
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.hasAuthSwitchLabel',
              {
                defaultMessage: 'Require authentication for this webhook',
              }
            )}
            disabled={readOnly}
            checked={hasAuth}
            onChange={(e) => {
              editActionConfig('hasAuth', e.target.checked);
              if (!e.target.checked) {
                editActionSecrets('user', null);
                editActionSecrets('password', null);
              }
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {hasAuth ? (
        <>
          {getEncryptedFieldNotifyLabel(
            !action.id,
            2,
            action.isMissingSecrets ?? false,
            i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.reenterValuesLabel',
              {
                defaultMessage:
                  'Username and password are encrypted. Please reenter values for these fields.',
              }
            )
          )}
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiFormRow
                id="webhookUser"
                fullWidth
                error={errors.user}
                isInvalid={isSecretsKeyValueInvalid('user')}
                label={i18n.translate(
                  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.userTextFieldLabel',
                  {
                    defaultMessage: 'Username',
                  }
                )}
              >
                <EuiFieldText
                  fullWidth
                  isInvalid={isSecretsKeyValueInvalid('user')}
                  name="user"
                  readOnly={readOnly}
                  value={user || ''}
                  data-test-subj="webhookUserInput"
                  onChange={(e) => {
                    editActionSecrets('user', e.target.value);
                  }}
                  onBlur={() => {
                    if (!user) {
                      editActionSecrets('user', '');
                    }
                  }}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                id="webhookPassword"
                fullWidth
                error={errors.password}
                isInvalid={isSecretsKeyValueInvalid('password')}
                label={i18n.translate(
                  'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.passwordTextFieldLabel',
                  {
                    defaultMessage: 'Password',
                  }
                )}
              >
                <EuiFieldPassword
                  fullWidth
                  name="password"
                  readOnly={readOnly}
                  isInvalid={isSecretsKeyValueInvalid('password')}
                  value={password || ''}
                  data-test-subj="webhookPasswordInput"
                  onChange={(e) => {
                    editActionSecrets('password', e.target.value);
                  }}
                  onBlur={() => {
                    if (!password) {
                      editActionSecrets('password', '');
                    }
                  }}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : null}
      <EuiSpacer size="m" />
      <EuiSwitch
        data-test-subj="webhookViewHeadersSwitch"
        disabled={readOnly}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.viewHeadersSwitch',
          {
            defaultMessage: 'Add HTTP header',
          }
        )}
        checked={hasHeaders}
        onChange={viewHeaders}
      />

      <EuiSpacer size="m" />
      <div>
        {Object.keys(headers || {}).length > 0 ? (
          <>
            <EuiSpacer size="m" />
            <EuiTitle size="xxs">
              <h5>
                <FormattedMessage
                  defaultMessage="Headers in use"
                  id="xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.httpHeadersTitle"
                />
              </h5>
            </EuiTitle>
            <EuiSpacer size="s" />
            {headersList}
          </>
        ) : null}
        <EuiSpacer size="m" />
        {hasHeaders && headerControl}
        <EuiSpacer size="m" />
      </div>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { CasesWebhookActionConnectorFields as default };
