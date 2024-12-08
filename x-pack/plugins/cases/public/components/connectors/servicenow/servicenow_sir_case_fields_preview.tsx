/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import type { ServiceNowSIRFieldsType } from '../../../../common/types/domain';
import { ConnectorTypes } from '../../../../common/types/domain';
import { useKibana } from '../../../common/lib/kibana';
import type { ConnectorFieldsPreviewProps } from '../types';
import { ConnectorCard } from '../card';
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

const ServiceNowSIRFieldsPreviewComponent: React.FunctionComponent<
  ConnectorFieldsPreviewProps<ServiceNowSIRFieldsType>
> = ({ connector, fields }) => {
  const {
    category = null,
    destIp = true,
    malwareHash = true,
    malwareUrl = true,
    priority = null,
    sourceIp = true,
    subcategory = null,
    additionalFields = null,
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

  const listItems = useMemo(
    () => [
      ...(destIp != null && destIp
        ? [
            {
              title: i18n.DEST_IP,
              description: i18n.ALERT_FIELD_ENABLED_TEXT,
            },
          ]
        : []),
      ...(sourceIp != null && sourceIp
        ? [
            {
              title: i18n.SOURCE_IP,
              description: i18n.ALERT_FIELD_ENABLED_TEXT,
            },
          ]
        : []),
      ...(malwareUrl != null && malwareUrl
        ? [
            {
              title: i18n.MALWARE_URL,
              description: i18n.ALERT_FIELD_ENABLED_TEXT,
            },
          ]
        : []),
      ...(malwareHash != null && malwareHash
        ? [
            {
              title: i18n.MALWARE_HASH,
              description: i18n.ALERT_FIELD_ENABLED_TEXT,
            },
          ]
        : []),
      ...(priority != null && priority.length > 0
        ? [
            {
              title: i18n.PRIORITY,
              description: priorityOptions.find((option) => `${option.value}` === priority)?.text,
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
      ...(additionalFields != null && additionalFields.length > 0
        ? [
            {
              title: i18n.ADDITIONAL_FIELDS_LABEL,
              description: additionalFields,
            },
          ]
        : []),
    ],
    [
      category,
      categoryOptions,
      destIp,
      malwareHash,
      malwareUrl,
      priority,
      priorityOptions,
      sourceIp,
      subcategory,
      subcategoryOptions,
      additionalFields,
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
            connectorType={ConnectorTypes.serviceNowSIR}
            title={connector.name}
            listItems={listItems}
            isLoading={isLoadingChoices}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
ServiceNowSIRFieldsPreviewComponent.displayName = 'ServiceNowSIRFieldsPreviewComponent';

// eslint-disable-next-line import/no-default-export
export { ServiceNowSIRFieldsPreviewComponent as default };
