/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiFormRow,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelectOption,
  EuiFieldText,
} from '@elastic/eui';

import {
  ConnectorTypes,
  ServiceNowSIRFieldsType,
} from '../../../../../../case/common/api/connectors';
import { useKibana } from '../../../../common/lib/kibana';
import { ConnectorFieldsProps } from '../types';
import { ConnectorCard } from '../card';
import { useGetChoices } from './use_get_choices';
import { Choice, Fields } from './types';

import * as i18n from './translations';

const useGetChoicesFields = ['category', 'subcategory', 'priority'];
const defaultFields: Fields = {
  category: [],
  subcategory: [],
  priority: [],
};

const choicesToEuiOptions = (choices: Choice[]): EuiSelectOption[] =>
  choices.map((choice) => ({ value: choice.value, text: choice.label }));

const ServiceNowFieldsComponent: React.FunctionComponent<
  ConnectorFieldsProps<ServiceNowSIRFieldsType>
> = ({ isEdit = true, fields, connector, onChange }) => {
  const {
    category = null,
    destIp = null,
    malwareHash = null,
    malwareUrl = null,
    priority = null,
    sourceIp = null,
    subcategory = null,
  } = fields ?? {};

  const { http, notifications } = useKibana().services;

  const [choices, setChoices] = useState<Fields>(defaultFields);

  const onChangeCb = useCallback(
    (
      key: keyof ServiceNowSIRFieldsType,
      value: ServiceNowSIRFieldsType[keyof ServiceNowSIRFieldsType]
    ) => {
      onChange({ ...fields, [key]: value });
    },
    [fields, onChange]
  );

  const onChoicesSuccess = (values: Choice[]) => {
    setChoices(
      values.reduce(
        (acc, value) => ({
          ...acc,
          [value.element]: [...(acc[value.element] != null ? acc[value.element] : []), value],
        }),
        defaultFields
      )
    );
  };

  const { isLoading: isLoadingChoices } = useGetChoices({
    http,
    toastNotifications: notifications.toasts,
    connector,
    fields: useGetChoicesFields,
    onSuccess: onChoicesSuccess,
  });

  const categoryOptions = useMemo(() => choicesToEuiOptions(choices.category), [choices.category]);
  const priorityOptions = useMemo(() => choicesToEuiOptions(choices.priority), [choices.priority]);

  const subcategoryOptions = useMemo(
    () =>
      choicesToEuiOptions(
        choices.subcategory.filter((choice) => choice.dependent_value === category)
      ),
    [choices.subcategory, category]
  );

  const listItems = useMemo(
    () => [
      ...(destIp != null && destIp.length > 0
        ? [
            {
              title: i18n.DEST_IP,
              description: destIp,
            },
          ]
        : []),
      ...(sourceIp != null && sourceIp.length > 0
        ? [
            {
              title: i18n.SOURCE_IP,
              description: sourceIp,
            },
          ]
        : []),
      ...(malwareUrl != null && malwareUrl.length > 0
        ? [
            {
              title: i18n.MALWARE_URL,
              description: malwareUrl,
            },
          ]
        : []),
      ...(malwareHash != null && malwareHash.length > 0
        ? [
            {
              title: i18n.MALWARE_HASH,
              description: malwareHash,
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
    ]
  );

  // We need to set them up at initialization
  useEffect(() => {
    onChange({ category, destIp, malwareHash, malwareUrl, priority, sourceIp, subcategory });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return isEdit ? (
    <span data-test-subj={'connector-fields-sn'}>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow fullWidth label={i18n.DEST_IP}>
            <EuiFieldText
              fullWidth
              value={destIp ?? ''}
              data-test-subj="destIpInput"
              onChange={(e) => onChangeCb('destIp', e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow fullWidth label={i18n.SOURCE_IP}>
            <EuiFieldText
              fullWidth
              value={sourceIp ?? ''}
              data-test-subj="sourceIpInput"
              onChange={(e) => onChangeCb('sourceIp', e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow fullWidth label={i18n.MALWARE_URL}>
            <EuiFieldText
              fullWidth
              value={malwareUrl ?? ''}
              data-test-subj="malwareUrlInput"
              onChange={(e) => onChangeCb('malwareUrl', e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow fullWidth label={i18n.MALWARE_HASH}>
            <EuiFieldText
              fullWidth
              value={malwareHash ?? ''}
              data-test-subj="malwareHashInput"
              onChange={(e) => onChangeCb('malwareHash', e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow fullWidth label={i18n.PRIORITY}>
            <EuiSelect
              fullWidth
              data-test-subj="prioritySelect"
              hasNoInitialSelection
              isLoading={isLoadingChoices}
              disabled={isLoadingChoices}
              options={priorityOptions}
              value={priority ?? undefined}
              onChange={(e) => onChangeCb('priority', e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow fullWidth label={i18n.CATEGORY}>
            <EuiSelect
              fullWidth
              data-test-subj="categorySelect"
              options={categoryOptions}
              value={category ?? undefined}
              isLoading={isLoadingChoices}
              disabled={isLoadingChoices}
              hasNoInitialSelection
              onChange={(e) => onChangeCb('category', e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow fullWidth label={i18n.SUBCATEGORY}>
            <EuiSelect
              fullWidth
              data-test-subj="subcategorySelect"
              options={subcategoryOptions}
              value={subcategory ?? undefined}
              isLoading={isLoadingChoices}
              disabled={isLoadingChoices}
              hasNoInitialSelection
              onChange={(e) => onChangeCb('subcategory', e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </span>
  ) : (
    <ConnectorCard
      connectorType={ConnectorTypes.serviceNowIM}
      title={connector.name}
      listItems={listItems}
      isLoading={false}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { ServiceNowFieldsComponent as default };
