/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiCheckbox,
  EuiSpacer,
  EuiText,
  htmlIdGenerator,
  EuiIconTip,
  EuiBetaBadge,
  EuiFlexItem,
  EuiFlexGroup,
} from '@elastic/eui';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { ThemeContext } from 'styled-components';
import type {
  PolicyOperatingSystem,
  UIPolicyConfig,
} from '../../../../../../../common/endpoint/types';
import { useShowEditableFormFields, usePolicyDetailsSelector } from '../../policy_hooks';
import { policyConfig } from '../../../store/policy_details/selectors';
import { ConfigForm, ConfigFormHeading } from '../config_form';

const OPERATING_SYSTEM_TO_TEST_SUBJ: { [K in OperatingSystem]: string } = {
  [OperatingSystem.WINDOWS]: 'Windows',
  [OperatingSystem.LINUX]: 'Linux',
  [OperatingSystem.MAC]: 'Mac',
};

interface OperatingSystemToOsMap {
  [OperatingSystem.WINDOWS]: PolicyOperatingSystem.windows;
  [OperatingSystem.LINUX]: PolicyOperatingSystem.linux;
  [OperatingSystem.MAC]: PolicyOperatingSystem.mac;
}

export type ProtectionField<T extends OperatingSystem> =
  keyof UIPolicyConfig[OperatingSystemToOsMap[T]]['events'];

export type EventFormSelection<T extends OperatingSystem> = { [K in ProtectionField<T>]: boolean };

export interface EventFormOption<T extends OperatingSystem> {
  name: string;
  protectionField: ProtectionField<T>;
}

export interface SupplementalEventFormOption<T extends OperatingSystem> {
  title?: string;
  description?: string;
  name: string;
  protectionField: ProtectionField<T>;
  tooltipText?: string;
  beta?: boolean;
  indented?: boolean;
  isDisabled?(policyConfig: UIPolicyConfig): boolean;
}

export interface EventsFormProps<T extends OperatingSystem> {
  os: T;
  options: ReadonlyArray<EventFormOption<T>>;
  selection: EventFormSelection<T>;
  onValueSelection: (value: ProtectionField<T>, selected: boolean) => void;
  supplementalOptions?: ReadonlyArray<SupplementalEventFormOption<T>>;
}

const InnerEventsForm = <T extends OperatingSystem>({
  os,
  options,
  selection,
  onValueSelection,
  supplementalOptions,
}: EventsFormProps<T>) => {
  const showEditableFormFields = useShowEditableFormFields();
  const policyDetailsConfig = usePolicyDetailsSelector(policyConfig);
  const theme = useContext(ThemeContext);
  const countSelected = useCallback(() => {
    const supplementalSelectionFields: string[] = supplementalOptions
      ? supplementalOptions.map((value) => value.protectionField as string)
      : [];
    return Object.entries(selection).filter(([key, value]) =>
      !supplementalSelectionFields.includes(key) ? value : false
    ).length;
  }, [selection, supplementalOptions]);

  return (
    <ConfigForm
      type={i18n.translate('xpack.securitySolution.endpoint.policy.details.eventCollection', {
        defaultMessage: 'Event collection',
      })}
      supportedOss={[os]}
      rightCorner={
        <EuiText size="s" color="subdued">
          {i18n.translate(
            'xpack.securitySolution.endpoint.policy.details.eventCollectionsEnabled',
            {
              defaultMessage: '{selected} / {total} event collections enabled',
              values: {
                selected: countSelected(),
                total: options.length,
              },
            }
          )}
        </EuiText>
      }
    >
      <ConfigFormHeading>
        {i18n.translate('xpack.securitySolution.endpoint.policyDetailsConfig.eventingEvents', {
          defaultMessage: 'Events',
        })}
      </ConfigFormHeading>
      <EuiSpacer size="s" />
      {options.map(({ name, protectionField }) => {
        return (
          <EuiCheckbox
            key={String(protectionField)}
            id={htmlIdGenerator()()}
            label={name}
            data-test-subj={`policy${OPERATING_SYSTEM_TO_TEST_SUBJ[os]}Event_${protectionField}`}
            checked={selection[protectionField]}
            onChange={(event) => onValueSelection(protectionField, event.target.checked)}
            disabled={!showEditableFormFields}
          />
        );
      })}
      {supplementalOptions &&
        supplementalOptions.map(
          ({
            title,
            description,
            name,
            protectionField,
            tooltipText,
            beta,
            indented,
            isDisabled,
          }) => {
            return (
              <div
                key={String(protectionField)}
                style={indented ? { paddingLeft: theme.eui.euiSizeL } : {}}
              >
                {title && (
                  <>
                    <EuiSpacer size="m" />
                    <ConfigFormHeading>{title}</ConfigFormHeading>
                  </>
                )}
                {description && (
                  <>
                    <EuiSpacer size="s" />
                    <EuiText size="xs" color="subdued">
                      {description}
                    </EuiText>
                  </>
                )}
                <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiSpacer size="s" />
                    <EuiCheckbox
                      id={htmlIdGenerator()()}
                      label={name}
                      data-test-subj={`policy${OPERATING_SYSTEM_TO_TEST_SUBJ[os]}Event_${protectionField}`}
                      checked={selection[protectionField]}
                      onChange={(event) => onValueSelection(protectionField, event.target.checked)}
                      disabled={
                        !showEditableFormFields ||
                        (isDisabled ? isDisabled(policyDetailsConfig) : false)
                      }
                    />
                  </EuiFlexItem>
                  {tooltipText && (
                    <EuiFlexItem grow={false}>
                      <EuiIconTip position="right" content={tooltipText} />
                    </EuiFlexItem>
                  )}
                  {beta && (
                    <EuiFlexItem grow={false}>
                      <EuiBetaBadge label="beta" size="s" />
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </div>
            );
          }
        )}
    </ConfigForm>
  );
};

InnerEventsForm.displayName = 'EventsForm';

export const EventsForm = React.memo(InnerEventsForm) as typeof InnerEventsForm;
