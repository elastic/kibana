/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiTitle,
  EuiSpacer,
  EuiComboBox,
  EuiIcon,
  EuiComboBoxOptionOption,
} from '@elastic/eui';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { SettingsFormProps } from '../../pages/settings';
import { connectorsSelector } from '../../state/alerts/alerts';
import { AddConnectorFlyout } from './add_connector_flyout';
import { useGetUrlParams, useUrlParams } from '../../hooks';
import { alertFormI18n } from './translations';
import { useInitApp } from '../../hooks/use_init_app';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { TriggersAndActionsUIPublicPluginStart } from '../../../../triggers_actions_ui/public/';

type ConnectorOption = EuiComboBoxOptionOption<string>;

interface KibanaDeps {
  triggers_actions_ui: TriggersAndActionsUIPublicPluginStart;
}

const ConnectorSpan = styled.span`
  .euiIcon {
    margin-right: 5px;
  }
  > img {
    width: 16px;
    height: 20px;
  }
`;

export const AlertDefaultsForm: React.FC<SettingsFormProps> = ({
  onChange,
  loading,
  formFields,
  fieldErrors,
  isDisabled,
}) => {
  const {
    services: {
      triggers_actions_ui: { actionTypeRegistry },
    },
  } = useKibana<KibanaDeps>();
  const { focusConnectorField } = useGetUrlParams();

  const updateUrlParams = useUrlParams()[1];

  const inputRef = useRef<HTMLInputElement | null>(null);

  useInitApp();

  useEffect(() => {
    if (focusConnectorField && inputRef.current && !loading) {
      inputRef.current.focus();
    }
  }, [focusConnectorField, inputRef, loading]);

  const { data = [] } = useSelector(connectorsSelector);

  const [error, setError] = useState<string | undefined>(undefined);

  const onBlur = () => {
    if (inputRef.current) {
      const { value } = inputRef.current;
      setError(value.length === 0 ? undefined : `"${value}" is not a valid option`);
    }
    if (inputRef.current && !loading && focusConnectorField) {
      updateUrlParams({ focusConnectorField: undefined });
    }
  };

  const onSearchChange = (value: string, hasMatchingOptions?: boolean) => {
    setError(
      value.length === 0 || hasMatchingOptions ? undefined : `"${value}" is not a valid option`
    );
  };

  const options = (data ?? []).map((connectorAction) => ({
    value: connectorAction.id,
    label: connectorAction.name,
    'data-test-subj': connectorAction.name,
  }));

  const renderOption = (option: ConnectorOption) => {
    const { label, value } = option;

    const { actionTypeId: type } = data?.find((dt) => dt.id === value) ?? {};
    return (
      <ConnectorSpan>
        <EuiIcon type={actionTypeRegistry.get(type as string).iconClass} />
        <span>{label}</span>
      </ConnectorSpan>
    );
  };

  const onOptionChange = (selectedOptions: ConnectorOption[]) => {
    onChange({
      defaultConnectors: selectedOptions.map((item) => {
        const conOpt = data?.find((dt) => dt.id === item.value)!;
        return conOpt.id;
      }),
    });
  };

  return (
    <>
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.uptime.sourceConfiguration.alertDefaults"
            defaultMessage="Alert defaults"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.uptime.sourceConfiguration.alertConnectors"
              defaultMessage="Alert Connectors"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.uptime.sourceConfiguration.defaultConnectors.description"
            defaultMessage="Default connectors to be used to send an alert."
          />
        }
      >
        <EuiFormRow
          describedByIds={['defaultConnectors']}
          error={error}
          fullWidth
          isInvalid={!!error}
          label={
            <FormattedMessage
              id="xpack.uptime.sourceConfiguration.defaultConnectors"
              defaultMessage="Default connectors"
            />
          }
        >
          <EuiComboBox
            placeholder={alertFormI18n.inputPlaceHolder}
            options={options}
            selectedOptions={options.filter((opt) =>
              formFields?.defaultConnectors?.includes(opt.value)
            )}
            inputRef={(input) => {
              inputRef.current = input;
            }}
            onSearchChange={onSearchChange}
            onBlur={onBlur}
            isLoading={loading}
            isDisabled={isDisabled}
            onChange={onOptionChange}
            data-test-subj={`default-connectors-input-${loading ? 'loading' : 'loaded'}`}
            renderOption={renderOption}
          />
        </EuiFormRow>
        <span>
          <AddConnectorFlyout
            focusInput={useCallback(() => {
              if (inputRef.current) {
                inputRef.current.focus();
              }
            }, [])}
          />
        </span>
      </EuiDescribedFormGroup>
    </>
  );
};
