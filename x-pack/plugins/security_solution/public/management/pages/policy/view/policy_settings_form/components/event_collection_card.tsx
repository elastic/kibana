/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useContext, useMemo } from 'react';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { ThemeContext } from 'styled-components';
import { i18n } from '@kbn/i18n';
import {
  EuiBetaBadge,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiSpacer,
  EuiText,
  htmlIdGenerator,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { cloneDeep, get, set } from 'lodash';
import type { EuiCheckboxProps } from '@elastic/eui/src/components/form/checkbox/checkbox';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import type { PolicyFormComponentCommonProps } from '../types';
import { SettingCard, SettingCardHeader } from './setting_card';
import type {
  PolicyOperatingSystem,
  UIPolicyConfig,
} from '../../../../../../../common/endpoint/types';

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

export interface EventCollectionCardProps<T extends OperatingSystem>
  extends PolicyFormComponentCommonProps {
  os: T;
  options: ReadonlyArray<EventFormOption<T>>;
  selection: EventFormSelection<T>;
  supplementalOptions?: ReadonlyArray<SupplementalEventFormOption<T>>;
}

// FIXME:PT fix EventCollectionCard generic
export const EventCollectionCard = memo(
  <T extends OperatingSystem>({
    policy,
    onChange,
    mode,
    os,
    options,
    selection,
    supplementalOptions,
    'data-test-subj': dataTestSubj,
  }: EventCollectionCardProps<T>) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isEditMode = mode === 'edit';
    const theme = useContext(ThemeContext);

    const selectedCount: number = useMemo(() => {
      const supplementalSelectionFields: string[] = supplementalOptions
        ? supplementalOptions.map((value) => value.protectionField as string)
        : [];
      return Object.entries(selection).filter(([key, value]) =>
        !supplementalSelectionFields.includes(key) ? value : false
      ).length;
    }, [selection, supplementalOptions]);

    return (
      <SettingCard
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
                  selected: selectedCount,
                  total: options.length,
                },
              }
            )}
          </EuiText>
        }
        dataTestSubj={getTestId()}
      >
        <SettingCardHeader>
          {i18n.translate('xpack.securitySolution.endpoint.policyDetailsConfig.eventingEvents', {
            defaultMessage: 'Events',
          })}
        </SettingCardHeader>
        <EuiSpacer size="s" />

        {options.map(({ name, protectionField }) => {
          const keyPath = `${os}.events.${protectionField}`;

          return (
            <EventCheckbox
              label={name}
              key={keyPath}
              keyPath={keyPath}
              policy={policy}
              onChange={onChange}
              mode={mode}
              data-test-subj={getTestId(protectionField as string)}
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
                      <SettingCardHeader>{title}</SettingCardHeader>
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
                        onChange={(event) => {
                          // onValueSelection(protectionField, event.target.checked)
                        }}
                        disabled={!isEditMode || (isDisabled ? isDisabled(policy) : false)}
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
      </SettingCard>
    );
  }
);
EventCollectionCard.displayName = 'EventCollectionCard';

interface EventCheckboxProps
  extends PolicyFormComponentCommonProps,
    Pick<EuiCheckboxProps, 'label'> {
  keyPath: string;
}

const EventCheckbox = memo<EventCheckboxProps>(
  ({ policy, onChange, label, mode, keyPath, 'data-test-subj': dataTestSubj }) => {
    const checkboxId = useGeneratedHtmlId();
    const isChecked: boolean = get(policy, keyPath);
    const isEditMode = mode === 'edit';

    const checkboxOnChangeHandler = useCallback(
      (ev) => {
        const updatedPolicy = cloneDeep(policy);
        set(updatedPolicy, keyPath, ev.target.checked);

        onChange({ isValid: true, updatedPolicy });
      },
      [keyPath, onChange, policy]
    );

    return isEditMode ? (
      <EuiCheckbox
        key={keyPath}
        id={checkboxId}
        label={label}
        data-test-subj={dataTestSubj}
        checked={isChecked}
        onChange={checkboxOnChangeHandler}
      />
    ) : (
      <div>{label}</div>
    );
  }
);
EventCheckbox.displayName = 'EventCheckbox';
