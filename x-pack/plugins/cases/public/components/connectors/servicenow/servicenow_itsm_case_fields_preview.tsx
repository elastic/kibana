/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import * as i18n from './translations';

import type { ConnectorFieldsPreviewProps } from '../types';
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

const ServiceNowITSMFieldsPreviewComponent: React.FunctionComponent<
  ConnectorFieldsPreviewProps<ServiceNowITSMFieldsType>
> = ({ connector, fields }) => {
  const {
    severity = null,
    urgency = null,
    impact = null,
    category = null,
    subcategory = null,
  } = fields ?? {};

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
              description:
                urgencyOptions.find((option) => `${option.value}` === urgency)?.text ?? '',
            },
          ]
        : []),
      ...(severity != null && severity.length > 0
        ? [
            {
              title: i18n.SEVERITY,
              description:
                severityOptions.find((option) => `${option.value}` === severity)?.text ?? '',
            },
          ]
        : []),
      ...(impact != null && impact.length > 0
        ? [
            {
              title: i18n.IMPACT,
              description: impactOptions.find((option) => `${option.value}` === impact)?.text ?? '',
            },
          ]
        : []),
      ...(category != null && category.length > 0
        ? [
            {
              title: i18n.CATEGORY,
              description:
                categoryOptions.find((option) => `${option.value}` === category)?.text ?? '',
            },
          ]
        : []),
      ...(subcategory != null && subcategory.length > 0
        ? [
            {
              title: i18n.SUBCATEGORY,
              description:
                subcategoryOptions.find((option) => `${option.value}` === subcategory)?.text ?? '',
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
      <EuiFlexGroup>
        <EuiFlexItem>
          <ConnectorCard
            connectorType={ConnectorTypes.serviceNowITSM}
            title={connector.name}
            listItems={listItems}
            isLoading={isLoadingChoices}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

ServiceNowITSMFieldsPreviewComponent.displayName = 'ServiceNowITSMFieldsPreview';
// eslint-disable-next-line import/no-default-export
export { ServiceNowITSMFieldsPreviewComponent as default };
