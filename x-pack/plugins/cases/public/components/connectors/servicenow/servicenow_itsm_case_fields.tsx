/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { UseField, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { SelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import * as i18n from './translations';

import type { ConnectorFieldsProps } from '../types';
import type { ServiceNowITSMFieldsType } from '../../../../common/api';
import { ConnectorTypes } from '../../../../common/api';
import { useKibana } from '../../../common/lib/kibana';
import { ConnectorCard } from '../card';
import { useGetChoices } from './use_get_choices';
import type { Fields } from './types';
import { choicesToEuiOptions } from './helpers';
import { DeprecatedCallout } from '../deprecated_callout';

const choicesToGet = ['urgency', 'severity', 'impact', 'category', 'subcategory'];
const defaultFields: Fields = {
  urgency: [],
  severity: [],
  impact: [],
  category: [],
  subcategory: [],
};

const ServiceNowITSMFieldsComponent: React.FunctionComponent<
  ConnectorFieldsProps<ServiceNowITSMFieldsType>
> = ({ isEdit = true, connector }) => {
  const [{ fields }] = useFormData<{ fields: ServiceNowITSMFieldsType }>();

  const {
    severity = null,
    urgency = null,
    impact = null,
    category = null,
    subcategory = null,
  } = fields ?? {};
  const { http, notifications } = useKibana().services;
  const showConnectorWarning = connector.isDeprecated;

  const { isLoading: isLoadingChoices, choices } = useGetChoices({
    http,
    toastNotifications: notifications.toasts,
    connector,
    fields: choicesToGet,
  });

  const choicesFormatted = choices.reduce(
    (acc, value) => ({
      ...acc,
      [value.element]: [...(acc[value.element] != null ? acc[value.element] : []), value],
    }),
    defaultFields
  );

  const categoryOptions = useMemo(
    () => choicesToEuiOptions(choicesFormatted.category),
    [choicesFormatted.category]
  );
  const urgencyOptions = useMemo(
    () => choicesToEuiOptions(choicesFormatted.urgency),
    [choicesFormatted.urgency]
  );
  const severityOptions = useMemo(
    () => choicesToEuiOptions(choicesFormatted.severity),
    [choicesFormatted.severity]
  );
  const impactOptions = useMemo(
    () => choicesToEuiOptions(choicesFormatted.impact),
    [choicesFormatted.impact]
  );

  const subcategoryOptions = useMemo(
    () =>
      choicesToEuiOptions(
        choicesFormatted.subcategory.filter((choice) => choice.dependent_value === category)
      ),
    [choicesFormatted.subcategory, category]
  );

  const listItems = useMemo(
    () => [
      ...(urgency != null && urgency.length > 0
        ? [
            {
              title: i18n.URGENCY,
              description: urgencyOptions.find((option) => `${option.value}` === urgency)?.text,
            },
          ]
        : []),
      ...(severity != null && severity.length > 0
        ? [
            {
              title: i18n.SEVERITY,
              description: severityOptions.find((option) => `${option.value}` === severity)?.text,
            },
          ]
        : []),
      ...(impact != null && impact.length > 0
        ? [
            {
              title: i18n.IMPACT,
              description: impactOptions.find((option) => `${option.value}` === impact)?.text,
            },
          ]
        : []),
      ...(category != null && category.length > 0
        ? [
            {
              title: i18n.CATEGORY,
              description: categoryOptions.find((option) => `${option.value}` === category)?.text,
            },
          ]
        : []),
      ...(subcategory != null && subcategory.length > 0
        ? [
            {
              title: i18n.SUBCATEGORY,
              description: subcategoryOptions.find((option) => `${option.value}` === subcategory)
                ?.text,
            },
          ]
        : []),
    ],
    [
      category,
      categoryOptions,
      impact,
      impactOptions,
      severity,
      severityOptions,
      subcategory,
      subcategoryOptions,
      urgency,
      urgencyOptions,
    ]
  );

  return (
    <>
      {showConnectorWarning && (
        <EuiFlexGroup>
          <EuiFlexItem>
            <DeprecatedCallout />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      {isEdit ? (
        <div data-test-subj="connector-fields-sn-itsm">
          <EuiFlexGroup>
            <EuiFlexItem>
              <UseField
                path="fields.urgency"
                component={SelectField}
                config={{
                  label: i18n.URGENCY,
                }}
                componentProps={{
                  euiFieldProps: {
                    'data-test-subj': 'urgencySelect',
                    options: urgencyOptions,
                    hasNoInitialSelection: true,
                    fullWidth: true,
                    disabled: isLoadingChoices,
                    isLoading: isLoadingChoices,
                  },
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiFlexGroup>
            <EuiFlexItem>
              <UseField
                path="fields.severity"
                component={SelectField}
                config={{
                  label: i18n.SEVERITY,
                }}
                componentProps={{
                  euiFieldProps: {
                    'data-test-subj': 'severitySelect',
                    options: severityOptions,
                    hasNoInitialSelection: true,
                    fullWidth: true,
                    disabled: isLoadingChoices,
                    isLoading: isLoadingChoices,
                  },
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <UseField
                path="fields.impact"
                component={SelectField}
                config={{
                  label: i18n.IMPACT,
                }}
                componentProps={{
                  euiFieldProps: {
                    'data-test-subj': 'impactSelect',
                    options: impactOptions,
                    hasNoInitialSelection: true,
                    fullWidth: true,
                    disabled: isLoadingChoices,
                    isLoading: isLoadingChoices,
                  },
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup>
            <EuiFlexItem>
              <UseField
                path="fields.category"
                component={SelectField}
                config={{
                  label: i18n.CATEGORY,
                }}
                componentProps={{
                  euiFieldProps: {
                    'data-test-subj': 'categorySelect',
                    options: categoryOptions,
                    hasNoInitialSelection: true,
                    fullWidth: true,
                    disabled: isLoadingChoices,
                    isLoading: isLoadingChoices,
                  },
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              {subcategoryOptions?.length > 0 ? (
                <UseField
                  path="fields.subcategory"
                  component={SelectField}
                  config={{
                    label: i18n.SUBCATEGORY,
                  }}
                  componentProps={{
                    euiFieldProps: {
                      'data-test-subj': 'subcategorySelect',
                      options: subcategoryOptions,
                      hasNoInitialSelection: true,
                      fullWidth: true,
                      disabled: isLoadingChoices,
                      isLoading: isLoadingChoices,
                    },
                  }}
                />
              ) : null}
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      ) : (
        <EuiFlexGroup>
          <EuiFlexItem>
            <ConnectorCard
              connectorType={ConnectorTypes.serviceNowITSM}
              title={connector.name}
              listItems={listItems}
              isLoading={false}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </>
  );
};

ServiceNowITSMFieldsComponent.displayName = 'ServiceNowITSMFields';
// eslint-disable-next-line import/no-default-export
export { ServiceNowITSMFieldsComponent as default };
