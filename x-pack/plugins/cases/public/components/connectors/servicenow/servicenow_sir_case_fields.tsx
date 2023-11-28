/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFormRow, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import {
  UseField,
  useFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { CheckBoxField, SelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { ServiceNowSIRFieldsType } from '../../../../common/types/domain';
import { useKibana } from '../../../common/lib/kibana';
import type { ConnectorFieldsProps } from '../types';
import { useGetChoices } from './use_get_choices';
import type { Fields } from './types';
import { choicesToEuiOptions } from './helpers';

import * as i18n from './translations';
import { DeprecatedCallout } from '../deprecated_callout';

const choicesToGet = ['category', 'subcategory', 'priority'];
const defaultFields: Fields = {
  category: [],
  subcategory: [],
  priority: [],
};

const ServiceNowSIRFieldsComponent: React.FunctionComponent<ConnectorFieldsProps> = ({
  connector,
}) => {
  const form = useFormContext();
  const [{ fields }] = useFormData<{ fields: ServiceNowSIRFieldsType }>();
  const { category = null } = fields ?? {};

  const { http } = useKibana().services;
  const showConnectorWarning = connector.isDeprecated;

  const {
    isLoading,
    isFetching,
    data: choicesData,
  } = useGetChoices({
    http,
    connector,
    fields: choicesToGet,
  });

  const choices = choicesData?.data ?? [];
  const isLoadingChoices = isLoading || isFetching;

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
  const priorityOptions = useMemo(
    () => choicesToEuiOptions(choicesFormatted.priority),
    [choicesFormatted.priority]
  );

  const subcategoryOptions = useMemo(
    () =>
      choicesToEuiOptions(
        choicesFormatted.subcategory.filter((choice) => choice.dependent_value === category)
      ),
    [choicesFormatted.subcategory, category]
  );

  const onCategoryChange = () => {
    form.setFieldValue('fields.subcategory', null);
  };

  return (
    <>
      {showConnectorWarning && (
        <EuiFlexGroup>
          <EuiFlexItem>
            <DeprecatedCallout />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiFlexGroup data-test-subj="connector-fields-sn-sir" direction="column" gutterSize="s">
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow fullWidth label={i18n.ALERT_FIELDS_LABEL}>
              <>
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <UseField
                      path="fields.destIp"
                      config={{ defaultValue: true }}
                      component={CheckBoxField}
                      componentProps={{
                        euiFieldProps: {
                          'data-test-subj': 'destIpCheckbox',
                          label: i18n.DEST_IP,
                          compressed: true,
                        },
                      }}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <UseField
                      path="fields.sourceIp"
                      config={{ defaultValue: true }}
                      component={CheckBoxField}
                      componentProps={{
                        euiFieldProps: {
                          'data-test-subj': 'sourceIpCheckbox',
                          label: i18n.SOURCE_IP,
                          compressed: true,
                        },
                      }}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <UseField
                      path="fields.malwareUrl"
                      config={{ defaultValue: true }}
                      component={CheckBoxField}
                      componentProps={{
                        euiFieldProps: {
                          'data-test-subj': 'malwareUrlCheckbox',
                          label: i18n.MALWARE_URL,
                          compressed: true,
                        },
                      }}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <UseField
                      path="fields.malwareHash"
                      config={{ defaultValue: true }}
                      component={CheckBoxField}
                      componentProps={{
                        euiFieldProps: {
                          'data-test-subj': 'malwareHashCheckbox',
                          label: i18n.MALWARE_HASH,
                          compressed: true,
                        },
                      }}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup>
          <EuiFlexItem>
            <UseField
              path="fields.priority"
              component={SelectField}
              config={{
                label: i18n.PRIORITY,
              }}
              componentProps={{
                euiFieldProps: {
                  'data-test-subj': 'prioritySelect',
                  options: priorityOptions,
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
              onChange={onCategoryChange}
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
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </>
  );
};
ServiceNowSIRFieldsComponent.displayName = 'ServiceNowSIRFieldsComponent';

// eslint-disable-next-line import/no-default-export
export { ServiceNowSIRFieldsComponent as default };
