/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { EuiFormRow, EuiSelect, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import * as i18n from './translations';

import { ConnectorFieldsProps } from '../types';
import {
  ConnectorTypes,
  ServiceNowITSMFieldsType,
} from '../../../../../../case/common/api/connectors';
import { useKibana } from '../../../../common/lib/kibana';
import { ConnectorCard } from '../card';
import { useGetChoices } from './use_get_choices';
import { Options, Choice } from './types';

const useGetChoicesFields = ['urgency', 'severity', 'impact'];
const defaultOptions: Options = {
  urgency: [],
  severity: [],
  impact: [],
};

const ServiceNowITSMFieldsComponent: React.FunctionComponent<
  ConnectorFieldsProps<ServiceNowITSMFieldsType>
> = ({ isEdit = true, fields, connector, onChange }) => {
  const init = useRef(true);
  const { severity = null, urgency = null, impact = null } = fields ?? {};
  const { http, notifications } = useKibana().services;
  const [options, setOptions] = useState<Options>(defaultOptions);

  const listItems = useMemo(
    () => [
      ...(urgency != null && urgency.length > 0
        ? [
            {
              title: i18n.URGENCY,
              description: options.urgency.find((option) => `${option.value}` === urgency)?.text,
            },
          ]
        : []),
      ...(severity != null && severity.length > 0
        ? [
            {
              title: i18n.SEVERITY,
              description: options.severity.find((option) => `${option.value}` === severity)?.text,
            },
          ]
        : []),
      ...(impact != null && impact.length > 0
        ? [
            {
              title: i18n.IMPACT,
              description: options.impact.find((option) => `${option.value}` === impact)?.text,
            },
          ]
        : []),
    ],
    [urgency, options.urgency, options.severity, options.impact, severity, impact]
  );

  const onChoicesSuccess = (choices: Choice[]) =>
    setOptions(
      choices.reduce(
        (acc, choice) => ({
          ...acc,
          [choice.element]: [
            ...(acc[choice.element] != null ? acc[choice.element] : []),
            { value: choice.value, text: choice.label },
          ],
        }),
        defaultOptions
      )
    );

  const { isLoading: isLoadingChoices } = useGetChoices({
    http,
    toastNotifications: notifications.toasts,
    connector,
    fields: useGetChoicesFields,
    onSuccess: onChoicesSuccess,
  });

  const onChangeCb = useCallback(
    (
      key: keyof ServiceNowITSMFieldsType,
      value: ServiceNowITSMFieldsType[keyof ServiceNowITSMFieldsType]
    ) => {
      onChange({ ...fields, [key]: value });
    },
    [fields, onChange]
  );

  // Set field at initialization
  useEffect(() => {
    if (init.current) {
      init.current = false;
      onChange({ urgency, severity, impact });
    }
  }, [impact, onChange, severity, urgency]);

  return isEdit ? (
    <div data-test-subj={'connector-fields-sn'}>
      <EuiFormRow fullWidth label={i18n.URGENCY}>
        <EuiSelect
          fullWidth
          data-test-subj="urgencySelect"
          options={options.urgency}
          value={urgency ?? undefined}
          isLoading={isLoadingChoices}
          disabled={isLoadingChoices}
          hasNoInitialSelection
          onChange={(e) => onChangeCb('urgency', e.target.value)}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow fullWidth label={i18n.SEVERITY}>
            <EuiSelect
              fullWidth
              data-test-subj="severitySelect"
              options={options.severity}
              value={severity ?? undefined}
              isLoading={isLoadingChoices}
              disabled={isLoadingChoices}
              hasNoInitialSelection
              onChange={(e) => onChangeCb('severity', e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow fullWidth label={i18n.IMPACT}>
            <EuiSelect
              fullWidth
              data-test-subj="impactSelect"
              options={options.impact}
              value={impact ?? undefined}
              isLoading={isLoadingChoices}
              disabled={isLoadingChoices}
              hasNoInitialSelection
              onChange={(e) => onChangeCb('impact', e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  ) : (
    <ConnectorCard
      connectorType={ConnectorTypes.serviceNowITSM}
      title={connector.name}
      listItems={listItems}
      isLoading={false}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { ServiceNowITSMFieldsComponent as default };
