/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useSelector } from 'react-redux';
import { EuiDescribedFormGroup } from '@elastic/eui';
import { OnFieldChangeType } from './certificate_form';
import { connectorsSelector } from '../../state/alerts/alerts';
import { DefaultEmail as DefaultEmailType } from '../../../common/runtime_types';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { UptimePluginServices } from '../../apps/plugin';
import { SettingsPageFieldErrors } from '../../pages/settings';

export function DefaultEmail({
  errors,
  value,
  isLoading,
  isDisabled,
  onChange,
  connectors,
}: {
  errors: SettingsPageFieldErrors['invalidEmail'];
  value?: DefaultEmailType;
  isLoading: boolean;
  isDisabled: boolean;
  onChange: OnFieldChangeType;
  connectors?: string[];
}) {
  const { actionTypeRegistry } = useKibana<UptimePluginServices>().services.triggersActionsUi;

  const { data = [] } = useSelector(connectorsSelector);

  if (
    !data?.find(
      (connector) => connectors?.includes(connector.id) && connector.actionTypeId === '.email'
    )
  ) {
    return null;
  }

  const emailActionType = actionTypeRegistry.get('.email');
  const ActionParams = emailActionType.actionParamsFields;

  const onEmailChange = (key: string, val: string[]) => {
    onChange({
      defaultEmail: {
        ...value,
        [key]: val,
      },
    });
  };

  return (
    <EuiDescribedFormGroup
      title={
        <h4>
          <FormattedMessage
            id="xpack.uptime.sourceConfiguration.alertConnectors.defaultEmail"
            defaultMessage="Default email"
          />
        </h4>
      }
      description={
        <FormattedMessage
          id="xpack.uptime.sourceConfiguration.defaultConnectors.description.defaultEmail"
          defaultMessage="Email settings required for selected email alert connectors."
        />
      }
    >
      <ActionParams
        actionParams={{
          to: value?.to ?? [],
          cc: value?.cc ?? [],
          bcc: value?.bcc ?? [],
        }}
        errors={errors ?? {}}
        editAction={(key, val, index) => onEmailChange(key, val as string[])}
        showEmailSubjectAndMessage={false}
        index={1}
        isLoading={isLoading}
        isDisabled={isDisabled}
      />
    </EuiDescribedFormGroup>
  );
}

export const validateEmail = (email: string) => {
  return String(email)
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
};
