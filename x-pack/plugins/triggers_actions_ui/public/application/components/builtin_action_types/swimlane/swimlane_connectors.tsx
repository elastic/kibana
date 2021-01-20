/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiCallOut,
  EuiFieldText,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiHorizontalRule,
  EuiComboBox,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import * as i18n from './translations';
import { ActionConnectorFieldsProps } from '../../../../types';
import { SwimlaneActionConnector, SwimlaneConfig, SwimlaneFieldMap } from './types';
import { useKibana } from '../../../../common/lib/kibana';
import { getApplication } from './api';

const SwimlaneActionConnectorFields: React.FunctionComponent<
  ActionConnectorFieldsProps<SwimlaneActionConnector>
> = ({ consumer, errors, action, editActionConfig, editActionSecrets, readOnly }) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

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

  const { apiToken } = useMemo(() => {
    const secrets = action.secrets ?? {};

    return secrets;
  }, [action.secrets]);

  const { mappings, apiUrl, appId } = useMemo(() => {
    const config = action.config ?? {};

    config.mappings =
      config.mappings ??
      (Object.assign(
        {},
        ...defaultNames.map((s) => ({ [s.key]: { key: s.name, id: '' } }))
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
  //
  // const editProperties = useCallback(
  //   (key: string, value: unknown) => {
  //     if()
  //   },
  //   [editActionConfig]
  // );

  // const fields = useMemo(()=>{
  //   if (!(apiToken && appId && apiUrl)) {
  //     return;
  //   }
  //
  // }, [apiToken, appId, apiUrl]);

  // const [selectedOptions, setSelected] = useState([]);
  const [isLoading, setLoading] = useState(false);
  const [options, setOptions] = useState([] as Array<{ label: string; value: string }>);
  // const { isLoading: isLoadingApplication, application } = useGetApplication({
  //   http,
  //   toastNotifications: toasts,
  //   actionConnector: this,
  //   id: appId,
  // });

  // const fieldOptions: EuiSelectOption[] = useMemo(() => {
  //   return application?.fields.map((f) => ({ value: f.id, text: f.key }));
  // }, [application]);
  //
  // const onFocus = () => {
  //   this.refs.
  //   useGetApplication({
  //     http,
  //     toastNotifications: toasts,
  //     actionConnector: this,
  //     id: appId,
  //   });
  // };
  const abortCtrl = useRef(new AbortController());

  const onSearchChange = useCallback(
    (searchValue) => {
      setLoading(true);
      setOptions([]);

      const didCancel = false;

      const fetchData = async () => {
        if (!apiToken || !apiUrl || !appId) {
          setLoading(false);
          return;
        }

        abortCtrl.current = new AbortController();
        setLoading(true);

        try {
          const res = await getApplication({
            http,
            signal: abortCtrl.current.signal,
            connectorId: action.id,
            id: appId,
          });
          if (!didCancel) {
            setLoading(false);
            const application = res.data?.application;
            if (application?.fields) {
              const applicationFields = application.fields;
              const fieldMap = applicationFields.map((f: { id: string; key: string }) => ({
                value: f.id,
                label: f.key,
              }));
              setOptions(fieldMap);
            }
            if (res.status && res.status === 'error') {
              toasts.addDanger({
                title: i18n.SW_GET_APPLICATION_API_ERROR(appId),
                text: `${res.serviceMessage ?? res.message}`,
              });
            }
          }
        } catch (error) {
          if (!didCancel) {
            setLoading(false);
            toasts.addDanger({
              title: i18n.SW_GET_APPLICATION_API_ERROR(appId),
              text: error.message,
            });
          }
        }
      };

      abortCtrl.current.abort();
      fetchData();
    },
    [toasts, action, appId, apiToken, http, apiUrl]
  );

  useEffect(() => {
    // Simulate initial load.
    onSearchChange('');
  }, [onSearchChange]);

  return (
    <Fragment>
      <EuiFormRow id="apiUrl" fullWidth label={i18n.SW_API_URL_TEXT_FIELD_LABEL}>
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
      <EuiFormRow id="appId" fullWidth label={i18n.SW_APP_ID_TEXT_FIELD_LABEL}>
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
        label={i18n.SW_API_TOKEN_TEXT_FIELD_LABEL}
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
        <h2>{i18n.SW_MAPPING_TITLE_TEXT_FIELD_LABEL}</h2>
        <p>{i18n.SW_MAPPING_DESCRIPTION_TEXT_FIELD_LABEL}</p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFormRow
        id="alertSourceKeyName"
        fullWidth
        label={i18n.SW_ALERT_SOURCE_KEY_NAME_TEXT_FIELD_LABEL}
      >
        <EuiFieldText
          fullWidth
          // name="alertSourceKeyName"
          value={mappings.alertSourceKeyName.fieldKey || 'alert-source'}
          readOnly={readOnly}
          data-test-subj="swimlanealertSourceKeyNameInput"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editMappings('alertSourceKeyName', e.target.value);
          }}
        />
      </EuiFormRow>
      <EuiFormRow id="severityKeyName" fullWidth label={i18n.SW_SEVERITY_KEY_NAME_TEXT_FIELD_LABEL}>
        <EuiFieldText
          fullWidth
          // name="severityKeyName"
          value={mappings.severityKeyName.fieldKey || 'severity'}
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
        label={i18n.SW_ALERT_NAME_KEY_NAME_TEXT_FIELD_LABEL}
      >
        <EuiFieldText
          fullWidth
          name="alertNameKeyName"
          value={mappings.alertNameKeyName.fieldKey || 'alert-name'}
          readOnly={readOnly}
          data-test-subj="swimlaneCaseIdKeyNameInput"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editMappings('alertNameKeyName', e.target.value);
          }}
        />
      </EuiFormRow>
      <EuiFormRow id="caseIdKeyName" fullWidth label={i18n.SW_CASE_ID_KEY_NAME_TEXT_FIELD_LABEL}>
        <EuiFieldText
          fullWidth
          name="caseIdKeyName"
          value={mappings.caseIdKeyName.fieldKey || 'ext-case-id'}
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
        label={i18n.SW_CASE_NAME_KEY_NAME_TEXT_FIELD_LABEL}
      >
        <EuiComboBox
          fullWidth
          isLoading={isLoading}
          isDisabled={isLoading}
          // name="caseNameKeyName"
          // value={mappings.caseNameKeyName.fieldKey}
          options={options}
          singleSelection={true}
          // readOnly={readOnly}
          // required={false}
          data-test-subj="swimlaneCaseNameKeyNameInput"
          onSearchChange={onSearchChange}
          // onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          //   editMappings('caseNameKeyName', e.target.value);
          // }}
        />
      </EuiFormRow>

      <EuiFormRow id="commentsKeyName" fullWidth label={i18n.SW_COMMENTS_KEY_NAME_TEXT_FIELD_LABEL}>
        <EuiFieldText
          fullWidth
          name="commentsKeyName"
          value={mappings.commentsKeyName.fieldKey}
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
        title={i18n.SW_REENTER_VALUE_LABEL}
      />
      <EuiSpacer size="m" />
    </Fragment>
  );
}

// eslint-disable-next-line import/no-default-export
export { SwimlaneActionConnectorFields as default };
