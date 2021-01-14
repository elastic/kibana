/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useCallback, useMemo } from 'react';
import {
  EuiCallOut,
  EuiFieldText,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ActionConnectorFieldsProps } from '../../../../types';
import { SwimlaneActionConnector, SwimlaneConfig, SwimlaneFieldMap } from '../types';
import { useKibana } from '../../../../common/lib/kibana';

const SwimlaneActionConnectorFields: React.FunctionComponent<
  ActionConnectorFieldsProps<SwimlaneActionConnector>
> = ({ errors, action, editActionConfig, editActionSecrets, readOnly }) => {
  const { apiToken } = action.secrets;
  const { docLinks } = useKibana().services;
  const defaultNames: SwimlaneFieldMap[] = useMemo(
    () => [
      { key: 'alertSourceKeyName', name: 'alert-source' },
      { key: 'severityKeyName', name: 'severity' },
      { key: 'caseNameKeyName', name: 'case-name' },
      { key: 'caseIdKeyName', name: 'case-id' },
      { key: 'alertNameKeyName', name: 'alert-name' },
      { key: 'commentsKeyName', name: 'comments' },
    ],
    []
  );

  const { mappings, apiUrl, appId } = useMemo(() => {
    const config = action.config ?? {};

    config.mappings =
      config.mappings ??
      (Object.assign(
        {},
        ...defaultNames.map((s) => ({ [s.key]: s.name }))
      ) as SwimlaneConfig['mappings']);

    return config;
  }, [defaultNames, action.config]);

  const editMappings = useCallback(
    (key: string, value: any) => {
      const newProps = { ...mappings, [key]: value };
      editActionConfig('mappings', newProps);
    },
    [editActionConfig, mappings]
  );

  return (
    <Fragment>
      <EuiFormRow
        id="apiUrl"
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.apiUrlTextFieldLabel',
          {
            defaultMessage: 'API URL',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="apiUrl"
          value={apiUrl}
          readOnly={readOnly}
          data-test-subj="swimlaneApiUrlInput"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editActionConfig('apiUrl', e.target.value);
          }}
          onBlur={() => {
            if (!apiUrl) {
              editActionConfig('apiUrl', '');
            }
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        id="appId"
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.appIdTextFieldLabel',
          {
            defaultMessage: 'Application Id',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="appId"
          value={appId || ''}
          readOnly={readOnly}
          data-test-subj="swimlaneAppIdInput"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editActionConfig('appId', e.target.value);
          }}
          onBlur={() => {
            if (!apiUrl) {
              editActionConfig('appId', '');
            }
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        id="apiToken"
        fullWidth
        helpText={
          <EuiLink
            href={`${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/swimlane-action-type.html`}
            target="_blank"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.apiTokenNameHelpLabel"
              defaultMessage="Provide a Swimlane API Token"
            />
          </EuiLink>
        }
        error={errors.apiToken}
        isInvalid={errors.apiToken.length > 0 && apiToken !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.apiTokenTextFieldLabel',
          {
            defaultMessage: 'API Token',
          }
        )}
      >
        <Fragment>
          {getEncryptedFieldNotifyLabel(!action.id)}
          <EuiFieldText
            fullWidth
            isInvalid={errors.apiToken.length > 0 && apiToken !== undefined}
            // name="apiToken"
            readOnly={readOnly}
            value={apiToken || ''}
            data-test-subj="swimlaneApiTokenInput"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              editActionSecrets('apiToken', e.target.value);
            }}
            onBlur={() => {
              if (!apiToken) {
                editActionSecrets('apiToken', '');
              }
            }}
          />
        </Fragment>
      </EuiFormRow>
      <EuiHorizontalRule />
      <EuiText>
        <h2>
          {i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.mappingTitleTextFieldLabel',
            {
              defaultMessage: 'Field Mappings',
            }
          )}
        </h2>
        <p>
          {i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.mappingDescriptionTextFieldLabel',
            {
              defaultMessage: 'Used to specify the field names in the Swimlane Application',
            }
          )}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFormRow
        id="alertSourceKeyName"
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.alertSourceKeyNameTextFieldLabel',
          {
            defaultMessage: 'Source Key',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          // name="alertSourceKeyName"
          value={mappings.alertSourceKeyName || 'alert-source'}
          readOnly={readOnly}
          data-test-subj="swimlanealertSourceKeyNameInput"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editMappings('alertSourceKeyName', e.target.value);
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        id="severityKeyName"
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.severityKeyNameTextFieldLabel',
          {
            defaultMessage: 'Severity Key',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          // name="severityKeyName"
          value={mappings.severityKeyName || 'severity'}
          readOnly={readOnly}
          data-test-subj="swimlaneSeverityKeyNameInput"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editMappings('severityKeyName', e.target.value);
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        id="alertNameKeyName"
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.alertNameKeyNameTextFieldLabel',
          {
            defaultMessage: 'Alert Name Key',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="alertNameKeyName"
          value={mappings.alertNameKeyName || 'alert-name'}
          readOnly={readOnly}
          data-test-subj="swimlaneCaseIdKeyNameInput"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editMappings('alertNameKeyName', e.target.value);
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        id="caseIdKeyName"
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.caseIdKeyNameTextFieldLabel',
          {
            defaultMessage: 'Case ID Key',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="caseIdKeyName"
          value={mappings.caseIdKeyName || 'ext-case-id'}
          readOnly={readOnly}
          data-test-subj="swimlaneCaseIdKeyNameInput"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editMappings('caseIdKeyName', e.target.value);
          }}
          onBlur={() => {
            if (!mappings.caseIdKeyName) {
              editMappings('caseIdKeyName', '');
            }
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        id="caseNameKeyName"
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.caseNameKeyNameTextFieldLabel',
          {
            defaultMessage: 'Case Name Key',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="caseNameKeyName"
          value={mappings.caseNameKeyName}
          readOnly={readOnly}
          required={false}
          data-test-subj="swimlaneCaseNameKeyNameInput"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editMappings('caseNameKeyName', e.target.value);
          }}
        />
      </EuiFormRow>

      <EuiFormRow
        id="commentsKeyName"
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.commentsKeyNameTextFieldLabel',
          {
            defaultMessage: 'Comments Key',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="commentsKeyName"
          value={mappings.commentsKeyName}
          readOnly={readOnly}
          required={false}
          data-test-subj="swimlaneCaseIdKeyNameInput"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editMappings('commentsKeyName', e.target.value);
          }}
        />
      </EuiFormRow>
    </Fragment>
  );
};

function getEncryptedFieldNotifyLabel(isCreate: boolean) {
  if (isCreate) {
    return (
      <Fragment>
        <EuiSpacer size="s" />
        <EuiText size="s" data-test-subj="rememberValuesMessage">
          <FormattedMessage
            id="xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.rememberValueLabel"
            defaultMessage="Remember this value. You must reenter it each time you edit the connector."
          />
        </EuiText>
        <EuiSpacer size="s" />
      </Fragment>
    );
  }
  return (
    <Fragment>
      <EuiSpacer size="s" />
      <EuiCallOut
        size="s"
        iconType="iInCircle"
        data-test-subj="reenterValuesMessage"
        title={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.reenterValueLabel',
          { defaultMessage: 'This key is encrypted. Please reenter a value for this field.' }
        )}
      />
      <EuiSpacer size="m" />
    </Fragment>
  );
}

// eslint-disable-next-line import/no-default-export
export { SwimlaneActionConnectorFields as default };
