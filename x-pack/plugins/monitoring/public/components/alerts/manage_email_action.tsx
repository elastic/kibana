/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiLink,
  EuiSpacer,
  EuiFieldNumber,
  EuiFieldPassword,
  EuiSwitch,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperSelect,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionResult } from '../../../../../plugins/actions/common';
import { getMissingFieldErrors, hasErrors, getRequiredFieldError } from '../../lib/form_validation';
import { ALERT_EMAIL_SERVICES } from '../../../common/constants';

export interface EmailActionData {
  service: string;
  host: string;
  port?: number;
  secure: boolean;
  from: string;
  user: string;
  password: string;
}

interface ManageActionModalProps {
  createEmailAction: (handler: EmailActionData) => void;
  cancel?: () => void;
  isNew: boolean;
  action?: ActionResult | null;
}

const DEFAULT_DATA: EmailActionData = {
  service: '',
  host: '',
  port: 0,
  secure: false,
  from: '',
  user: '',
  password: '',
};

const CREATE_LABEL = i18n.translate('xpack.monitoring.alerts.migrate.manageAction.createLabel', {
  defaultMessage: 'Create email action',
});
const SAVE_LABEL = i18n.translate('xpack.monitoring.alerts.migrate.manageAction.saveLabel', {
  defaultMessage: 'Save email action',
});
const CANCEL_LABEL = i18n.translate('xpack.monitoring.alerts.migrate.manageAction.cancelLabel', {
  defaultMessage: 'Cancel',
});

const NEW_SERVICE_ID = '__new__';

export const ManageEmailAction: React.FC<ManageActionModalProps> = (
  props: ManageActionModalProps
) => {
  const { createEmailAction, cancel, isNew, action } = props;

  const defaultData = Object.assign({}, DEFAULT_DATA, action ? action.config : {});
  const [isSaving, setIsSaving] = React.useState(false);
  const [showErrors, setShowErrors] = React.useState(false);
  const [errors, setErrors] = React.useState<EmailActionData | any>(
    getMissingFieldErrors(defaultData, DEFAULT_DATA)
  );
  const [data, setData] = React.useState(defaultData);
  const [createNewService, setCreateNewService] = React.useState(false);
  const [newService, setNewService] = React.useState('');

  React.useEffect(() => {
    const missingFieldErrors = getMissingFieldErrors(data, DEFAULT_DATA);
    if (!missingFieldErrors.service) {
      if (data.service === NEW_SERVICE_ID && !newService) {
        missingFieldErrors.service = getRequiredFieldError('service');
      }
    }
    setErrors(missingFieldErrors);
  }, [data, newService]);

  async function saveEmailAction() {
    setShowErrors(true);
    if (!hasErrors(errors)) {
      setShowErrors(false);
      setIsSaving(true);
      const mergedData = {
        ...data,
        service: data.service === NEW_SERVICE_ID ? newService : data.service,
      };
      try {
        await createEmailAction(mergedData);
      } catch (err) {
        setErrors({
          general: err.body.message,
        });
      }
    }
  }

  const serviceOptions = ALERT_EMAIL_SERVICES.map((service) => ({
    value: service,
    inputDisplay: <EuiText>{service}</EuiText>,
    dropdownDisplay: <EuiText>{service}</EuiText>,
  }));

  serviceOptions.push({
    value: NEW_SERVICE_ID,
    inputDisplay: (
      <EuiText>
        {i18n.translate('xpack.monitoring.alerts.migrate.manageAction.addingNewServiceText', {
          defaultMessage: 'Adding new service...',
        })}
      </EuiText>
    ),
    dropdownDisplay: (
      <EuiText>
        {i18n.translate('xpack.monitoring.alerts.migrate.manageAction.addNewServiceText', {
          defaultMessage: 'Add new service...',
        })}
      </EuiText>
    ),
  });

  let addNewServiceUi = null;
  if (createNewService) {
    addNewServiceUi = (
      <Fragment>
        <EuiSpacer />
        <EuiFieldText
          value={newService}
          onChange={(e) => setNewService(e.target.value)}
          isInvalid={showErrors}
        />
      </Fragment>
    );
  }

  return (
    <EuiForm isInvalid={showErrors} error={Object.values(errors)}>
      <EuiFormRow
        label={i18n.translate('xpack.monitoring.alerts.migrate.manageAction.serviceText', {
          defaultMessage: 'Service',
        })}
        helpText={
          <EuiLink external target="_blank" href="https://nodemailer.com/smtp/well-known/">
            {i18n.translate('xpack.monitoring.alerts.migrate.manageAction.serviceHelpText', {
              defaultMessage: 'Find out more',
            })}
          </EuiLink>
        }
        error={errors.service}
        isInvalid={showErrors && !!errors.service}
      >
        <Fragment>
          <EuiSuperSelect
            options={serviceOptions}
            valueOfSelected={data.service}
            onChange={(id) => {
              if (id === NEW_SERVICE_ID) {
                setCreateNewService(true);
                setData({ ...data, service: NEW_SERVICE_ID });
              } else {
                setCreateNewService(false);
                setData({ ...data, service: id });
              }
            }}
            hasDividers
            isInvalid={showErrors && !!errors.service}
          />
          {addNewServiceUi}
        </Fragment>
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.monitoring.alerts.migrate.manageAction.hostText', {
          defaultMessage: 'Host',
        })}
        helpText={i18n.translate('xpack.monitoring.alerts.migrate.manageAction.hostHelpText', {
          defaultMessage: 'Host name of the service provider',
        })}
        error={errors.host}
        isInvalid={showErrors && !!errors.host}
      >
        <EuiFieldText
          value={data.host}
          onChange={(e) => setData({ ...data, host: e.target.value })}
          isInvalid={showErrors && !!errors.host}
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.monitoring.alerts.migrate.manageAction.portText', {
          defaultMessage: 'Port',
        })}
        helpText={i18n.translate('xpack.monitoring.alerts.migrate.manageAction.portHelpText', {
          defaultMessage: 'Port number of the service provider',
        })}
        error={errors.port}
        isInvalid={showErrors && !!errors.port}
      >
        <EuiFieldNumber
          value={data.port}
          onChange={(e) => setData({ ...data, port: parseInt(e.target.value, 10) })}
          isInvalid={showErrors && !!errors.port}
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.monitoring.alerts.migrate.manageAction.secureText', {
          defaultMessage: 'Secure',
        })}
        helpText={i18n.translate('xpack.monitoring.alerts.migrate.manageAction.secureHelpText', {
          defaultMessage: 'Whether to use TLS with the service provider',
        })}
      >
        <EuiSwitch
          label=""
          checked={data.secure}
          onChange={(e) => setData({ ...data, secure: e.target.checked })}
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.monitoring.alerts.migrate.manageAction.fromText', {
          defaultMessage: 'From',
        })}
        helpText={i18n.translate('xpack.monitoring.alerts.migrate.manageAction.fromHelpText', {
          defaultMessage: 'The from email address for alerts',
        })}
        error={errors.from}
        isInvalid={showErrors && !!errors.from}
      >
        <EuiFieldText
          value={data.from}
          onChange={(e) => setData({ ...data, from: e.target.value })}
          isInvalid={showErrors && !!errors.from}
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.monitoring.alerts.migrate.manageAction.userText', {
          defaultMessage: 'User',
        })}
        helpText={i18n.translate('xpack.monitoring.alerts.migrate.manageAction.userHelpText', {
          defaultMessage: 'The user to use with the service provider',
        })}
        error={errors.user}
        isInvalid={showErrors && !!errors.user}
      >
        <EuiFieldText
          value={data.user}
          onChange={(e) => setData({ ...data, user: e.target.value })}
          isInvalid={showErrors && !!errors.user}
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.monitoring.alerts.migrate.manageAction.passwordText', {
          defaultMessage: 'Password',
        })}
        helpText={i18n.translate('xpack.monitoring.alerts.migrate.manageAction.passwordHelpText', {
          defaultMessage: 'The password to use with the service provider',
        })}
        error={errors.password}
        isInvalid={showErrors && !!errors.password}
      >
        <EuiFieldPassword
          value={data.password}
          onChange={(e) => setData({ ...data, password: e.target.value })}
          isInvalid={showErrors && !!errors.password}
        />
      </EuiFormRow>

      <EuiSpacer />

      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton type="submit" fill onClick={saveEmailAction} isLoading={isSaving}>
            {isNew ? CREATE_LABEL : SAVE_LABEL}
          </EuiButton>
        </EuiFlexItem>
        {!action || isNew ? null : (
          <EuiFlexItem grow={false}>
            <EuiButton onClick={cancel}>{CANCEL_LABEL}</EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiForm>
  );
};
