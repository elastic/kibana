/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState, useRef } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiTitle,
  EuiSpacer,
  EuiComboBox,
  EuiText,
  EuiIcon,
  EuiComboBoxOptionOption,
  EuiButtonEmpty,
} from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { SettingsFormProps } from '../../pages/settings';
import { connectorsSelector, getConnectorsAction } from '../../state/alerts/alerts';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';

type ConnectorOption = EuiComboBoxOptionOption<string>;

export const AlertDefaultsForm: React.FC<SettingsFormProps> = ({
  onChange,
  loading,
  formFields,
  fieldErrors,
  isDisabled,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const dispatch = useDispatch();

  const kibana = useKibana();
  const path = kibana.services?.application?.getUrlForApp(
    'management/insightsAndAlerting/triggersActions/connectors'
  );

  useEffect(() => {
    dispatch(getConnectorsAction.get());
  }, [dispatch]);

  const { data = [] } = useSelector(connectorsSelector);

  const [error, setError] = useState<string | undefined>(undefined);

  const onBlur = () => {
    if (inputRef.current) {
      const { value } = inputRef.current;
      setError(value.length === 0 ? undefined : `"${value}" is not a valid option`);
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
  }));

  const renderOption = (option: ConnectorOption) => {
    const { label, value } = option;

    const { actionTypeId: type } = data?.find((dt) => dt.id === value) ?? {};
    return (
      <EuiText size="m">
        <EuiIcon type={type === '.slack' ? 'logoSlack' : 'email'} /> {label}
      </EuiText>
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
              id="xpack.uptime.sourceConfiguration.defaultConnectors"
              defaultMessage="Connectors"
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
          <>
            <EuiComboBox
              placeholder="Please select one or more connectors"
              options={options}
              selectedOptions={options.filter((opt) =>
                formFields?.defaultConnectors.includes(opt.value)
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
            <EuiButtonEmpty iconType="plusInCircleFilled" href={path}>
              New connector
            </EuiButtonEmpty>
          </>
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </>
  );
};
