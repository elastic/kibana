/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren, ReactElement, ReactNode } from 'react';
import React, { memo, useCallback, useContext, useMemo } from 'react';
import type { OperatingSystem } from '@kbn/securitysolution-utils';
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
  useGeneratedHtmlId,
} from '@elastic/eui';
import { cloneDeep, get, set } from 'lodash';
import type { EuiCheckboxProps } from '@elastic/eui/src/components/form/checkbox/checkbox';
import { getEmptyValue } from '../../../../../../common/components/empty_value';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import type { PolicyFormComponentCommonProps } from '../types';
import { SettingCard, SettingCardHeader } from './setting_card';
import type {
  PolicyOperatingSystem,
  UIPolicyConfig,
} from '../../../../../../../common/endpoint/types';

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
  id?: string;
  title?: string;
  description?: string;
  name: string;
  uncheckedName?: string;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ANY = any;
type EventCollectionCardComponent = <T extends OperatingSystem>(
  props: PropsWithChildren<EventCollectionCardProps<T>>,
  context?: ANY
) => ReactElement<ANY, ANY> | null;

// FIXME:PT fix EventCollectionCard generic
export const EventCollectionCard: EventCollectionCardComponent = memo(
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
    const totalOptions = options.length;

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
                  total: totalOptions,
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

        {selectedCount === 0 && !isEditMode && <div>{getEmptyValue()}</div>}

        {supplementalOptions &&
          supplementalOptions.map(
            ({
              title,
              description,
              name,
              uncheckedName,
              protectionField,
              tooltipText,
              beta,
              indented,
              isDisabled,
            }) => {
              const keyPath = `${os}.events.${protectionField}`;
              const isChecked = get(policy, keyPath);

              if (!isEditMode && !isChecked) {
                return null;
              }

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

                      <EventCheckbox
                        label={name}
                        unCheckedLabel={uncheckedName}
                        key={keyPath}
                        keyPath={keyPath}
                        policy={policy}
                        onChange={onChange}
                        mode={mode}
                        disabled={isDisabled ? isDisabled(policy) : false}
                        data-test-subj={getTestId(protectionField as string)}
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
    Pick<EuiCheckboxProps, 'label' | 'disabled'> {
  keyPath: string;
  unCheckedLabel?: ReactNode;
}

const EventCheckbox = memo<EventCheckboxProps>(
  ({
    policy,
    onChange,
    label,
    unCheckedLabel,
    mode,
    keyPath,
    disabled,
    'data-test-subj': dataTestSubj,
  }) => {
    const checkboxId = useGeneratedHtmlId();
    const isChecked: boolean = get(policy, keyPath);
    const isEditMode = mode === 'edit';
    const displayLabel = isChecked ? label : unCheckedLabel ? unCheckedLabel : label;

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
        label={displayLabel}
        data-test-subj={dataTestSubj}
        checked={isChecked}
        onChange={checkboxOnChangeHandler}
        disabled={disabled}
      />
    ) : isChecked ? (
      <div>{displayLabel}</div>
    ) : null;
  }
);
EventCheckbox.displayName = 'EventCheckbox';
