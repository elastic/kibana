/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { EuiFormRow, EuiSelect, EuiFlexGroup, EuiFlexItem, EuiCheckbox } from '@elastic/eui';

import { ConnectorTypes, ServiceNowSIRFieldsType } from '../../../../common/api';
import { useKibana } from '../../../common/lib/kibana';
import { ConnectorFieldsProps } from '../types';
import { ConnectorCard } from '../card';
import { useGetChoices } from './use_get_choices';
import { Choice, Fields } from './types';
import { choicesToEuiOptions } from './helpers';

import * as i18n from './translations';
import { connectorValidator } from './validator';
import { DeprecatedCallout } from '../deprecated_callout';

const useGetChoicesFields = ['category', 'subcategory', 'priority'];
const defaultFields: Fields = {
  category: [],
  subcategory: [],
  priority: [],
};

const ServiceNowSIRFieldsComponent: React.FunctionComponent<
  ConnectorFieldsProps<ServiceNowSIRFieldsType>
> = ({ isEdit = true, fields, connector, onChange }) => {
  const init = useRef(true);
  const {
    category = null,
    destIp = true,
    malwareHash = true,
    malwareUrl = true,
    priority = null,
    sourceIp = true,
    subcategory = null,
  } = fields ?? {};

  const { http, notifications } = useKibana().services;
  const [choices, setChoices] = useState<Fields>(defaultFields);
  const showConnectorWarning = useMemo(() => connectorValidator(connector) != null, [connector]);

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

  // Set field at initialization
  useEffect(() => {
    if (init.current) {
      init.current = false;
      onChange({ category, destIp, malwareHash, malwareUrl, priority, sourceIp, subcategory });
    }
  }, [category, destIp, malwareHash, malwareUrl, onChange, priority, sourceIp, subcategory]);

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
        <div data-test-subj="connector-fields-sn-sir">
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow fullWidth label={i18n.ALERT_FIELDS_LABEL}>
                <>
                  <EuiFlexGroup>
                    <EuiFlexItem>
                      <EuiCheckbox
                        id="destIpCheckbox"
                        data-test-subj="destIpCheckbox"
                        label={i18n.DEST_IP}
                        checked={destIp ?? false}
                        compressed
                        onChange={(e) => onChangeCb('destIp', e.target.checked)}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiCheckbox
                        id="sourceIpCheckbox"
                        data-test-subj="sourceIpCheckbox"
                        label={i18n.SOURCE_IP}
                        checked={sourceIp ?? false}
                        compressed
                        onChange={(e) => onChangeCb('sourceIp', e.target.checked)}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiFlexGroup>
                    <EuiFlexItem>
                      <EuiCheckbox
                        id="malwareUrlCheckbox"
                        data-test-subj="malwareUrlCheckbox"
                        label={i18n.MALWARE_URL}
                        checked={malwareUrl ?? false}
                        compressed
                        onChange={(e) => onChangeCb('malwareUrl', e.target.checked)}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiCheckbox
                        id="malwareHashCheckbox"
                        data-test-subj="malwareHashCheckbox"
                        label={i18n.MALWARE_HASH}
                        checked={malwareHash ?? false}
                        compressed
                        onChange={(e) => onChangeCb('malwareHash', e.target.checked)}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </>
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
                  onChange={(e) =>
                    onChange({ ...fields, category: e.target.value, subcategory: null })
                  }
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              {subcategoryOptions?.length > 0 ? (
                <EuiFormRow fullWidth label={i18n.SUBCATEGORY}>
                  <EuiSelect
                    fullWidth
                    data-test-subj="subcategorySelect"
                    options={subcategoryOptions}
                    // Needs an empty string instead of undefined to select the blank option when changing categories
                    value={subcategory ?? ''}
                    isLoading={isLoadingChoices}
                    disabled={isLoadingChoices}
                    hasNoInitialSelection
                    onChange={(e) => onChangeCb('subcategory', e.target.value)}
                  />
                </EuiFormRow>
              ) : null}
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      ) : (
        <EuiFlexGroup>
          <EuiFlexItem>
            <ConnectorCard
              connectorType={ConnectorTypes.serviceNowSIR}
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
ServiceNowSIRFieldsComponent.displayName = 'ServiceNowSIRFieldsComponent';

// eslint-disable-next-line import/no-default-export
export { ServiceNowSIRFieldsComponent as default };
