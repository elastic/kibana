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
import { ConnectorTypes, ServiceNowITSMFieldsType } from '../../../../common/api';
import { useKibana } from '../../../common/lib/kibana';
import { ConnectorCard } from '../card';
import { useGetChoices } from './use_get_choices';
import { Fields, Choice } from './types';
import { choicesToEuiOptions } from './helpers';
import { connectorValidator } from './validator';
import { DeprecatedCallout } from '../deprecated_callout';

const useGetChoicesFields = ['urgency', 'severity', 'impact', 'category', 'subcategory'];
const defaultFields: Fields = {
  urgency: [],
  severity: [],
  impact: [],
  category: [],
  subcategory: [],
};

const ServiceNowITSMFieldsComponent: React.FunctionComponent<
  ConnectorFieldsProps<ServiceNowITSMFieldsType>
> =
  // TODO: Fix this manually. Issue #123375
  // eslint-disable-next-line react/display-name
  ({ isEdit = true, fields, connector, onChange }) => {
    const init = useRef(true);
    const {
      severity = null,
      urgency = null,
      impact = null,
      category = null,
      subcategory = null,
    } = fields ?? {};
    const { http, notifications } = useKibana().services;
    const [choices, setChoices] = useState<Fields>(defaultFields);
    const showConnectorWarning = useMemo(() => connectorValidator(connector) != null, [connector]);

    const categoryOptions = useMemo(
      () => choicesToEuiOptions(choices.category),
      [choices.category]
    );
    const urgencyOptions = useMemo(() => choicesToEuiOptions(choices.urgency), [choices.urgency]);
    const severityOptions = useMemo(
      () => choicesToEuiOptions(choices.severity),
      [choices.severity]
    );
    const impactOptions = useMemo(() => choicesToEuiOptions(choices.impact), [choices.impact]);

    const subcategoryOptions = useMemo(
      () =>
        choicesToEuiOptions(
          choices.subcategory.filter((choice) => choice.dependent_value === category)
        ),
      [choices.subcategory, category]
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
        onChange({ urgency, severity, impact, category, subcategory });
      }
    }, [category, impact, onChange, severity, subcategory, urgency]);

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
                <EuiFormRow fullWidth label={i18n.URGENCY}>
                  <EuiSelect
                    fullWidth
                    data-test-subj="urgencySelect"
                    options={urgencyOptions}
                    value={urgency ?? undefined}
                    isLoading={isLoadingChoices}
                    disabled={isLoadingChoices}
                    hasNoInitialSelection
                    onChange={(e) => onChangeCb('urgency', e.target.value)}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFormRow fullWidth label={i18n.SEVERITY}>
                  <EuiSelect
                    fullWidth
                    data-test-subj="severitySelect"
                    options={severityOptions}
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
                    options={impactOptions}
                    value={impact ?? undefined}
                    isLoading={isLoadingChoices}
                    disabled={isLoadingChoices}
                    hasNoInitialSelection
                    onChange={(e) => onChangeCb('impact', e.target.value)}
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

// eslint-disable-next-line import/no-default-export
export { ServiceNowITSMFieldsComponent as default };
