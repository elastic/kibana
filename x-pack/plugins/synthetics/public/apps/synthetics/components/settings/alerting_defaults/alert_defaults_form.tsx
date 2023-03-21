/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiSpacer,
} from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import { isEmpty, isEqual } from 'lodash';
import { hasInvalidEmail } from './validation';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../../../common/constants';
import { DefaultEmail } from './default_email';
import { selectDynamicSettings } from '../../../state/settings/selectors';
import {
  getDynamicSettingsAction,
  setDynamicSettingsAction,
} from '../../../state/settings/actions';
import { DefaultConnectorField } from './connector_field';
import { DynamicSettings } from '../../../../../../common/runtime_types';
import { useAlertingDefaults } from './hooks/use_alerting_defaults';

interface FormFields extends Omit<DynamicSettings, 'defaultEmail'> {
  defaultEmail: Partial<DynamicSettings['defaultEmail']>;
}

export const AlertDefaultsForm = () => {
  const dispatch = useDispatch();

  const { settings, loading } = useSelector(selectDynamicSettings);

  const [formFields, setFormFields] = useState<FormFields>(DYNAMIC_SETTINGS_DEFAULTS as FormFields);

  const canEdit: boolean =
    !!useKibana().services?.application?.capabilities.uptime.configureSettings || false;

  const isDisabled = !canEdit;

  useEffect(() => {
    if (settings) {
      setFormFields(settings as FormFields);
    }
  }, [settings]);

  useEffect(() => {
    dispatch(getDynamicSettingsAction.get());
  }, [dispatch]);

  const { connectors } = useAlertingDefaults();

  const hasEmailConnector = connectors?.find(
    (connector) =>
      formFields.defaultConnectors?.includes(connector.id) && connector.actionTypeId === '.email'
  );

  const onApply = () => {
    dispatch(setDynamicSettingsAction.get(formFields as DynamicSettings));
  };

  const isFormDirty = !isEqual(formFields, settings);

  const isFormValid = () => {
    if (hasEmailConnector) {
      return isEmpty(hasInvalidEmail(formFields?.defaultConnectors, formFields?.defaultEmail));
    }
    return true;
  };

  return (
    <EuiForm>
      <EuiSpacer size="m" />
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.synthetics.settings.defaultConnectors"
              defaultMessage="Default Connectors"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.synthetics.settings.defaultConnectors.description"
            defaultMessage="Selector one or more connectors to be used for alerts. These settings will be applied to all synthetics based alerts."
          />
        }
      >
        <DefaultConnectorField
          isDisabled={isDisabled}
          isLoading={loading}
          selectedConnectors={formFields.defaultConnectors}
          onChange={(value) => setFormFields({ ...formFields, defaultConnectors: value })}
        />
      </EuiDescribedFormGroup>
      {hasEmailConnector && (
        <DefaultEmail
          loading={loading}
          isDisabled={isDisabled}
          value={formFields.defaultEmail}
          selectedConnectors={formFields.defaultConnectors}
          onChange={(value) => setFormFields((prevStat) => ({ ...prevStat, defaultEmail: value }))}
        />
      )}
      <EuiSpacer />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="cross"
            onClick={() => {
              setFormFields((settings ?? DYNAMIC_SETTINGS_DEFAULTS) as FormFields);
            }}
            flush="left"
            isDisabled={!isFormDirty}
            isLoading={loading}
          >
            {DISCARD_CHANGES}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={(evt: React.FormEvent) => {
              evt.preventDefault();
              onApply();
            }}
            fill
            isLoading={loading}
            isDisabled={!isFormDirty || isDisabled || !isFormValid()}
          >
            {APPLY_CHANGES}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
};

const DISCARD_CHANGES = i18n.translate('xpack.synthetics.settings.discardChanges', {
  defaultMessage: 'Discard changes',
});

const APPLY_CHANGES = i18n.translate('xpack.synthetics.settings.applyChanges', {
  defaultMessage: 'Apply changes',
});
