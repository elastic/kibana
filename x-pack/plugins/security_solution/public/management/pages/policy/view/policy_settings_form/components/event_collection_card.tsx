/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
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
} from '@elastic/eui';
import { cloneDeep, get, set } from 'lodash';
import type { EuiCheckboxProps } from '@elastic/eui/src/components/form/checkbox/checkbox';
import { getEmptyValue } from '../../../../../../common/components/empty_value';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import type { PolicyFormComponentCommonProps } from '../types';
import { SettingCard, SettingCardHeader } from './setting_card';
import { PolicyOperatingSystem } from '../../../../../../../common/endpoint/types';
import type { UIPolicyConfig } from '../../../../../../../common/endpoint/types';

const mapOperatingSystemToPolicyOsKey = {
  [OperatingSystem.WINDOWS]: PolicyOperatingSystem.windows,
  [OperatingSystem.LINUX]: PolicyOperatingSystem.linux,
  [OperatingSystem.MAC]: PolicyOperatingSystem.mac,
} as const;

type OperatingSystemToOsMap = typeof mapOperatingSystemToPolicyOsKey;

export type ProtectionField<T extends OperatingSystem> =
  keyof UIPolicyConfig[OperatingSystemToOsMap[T]]['events'];

export type EventFormSelection<T extends OperatingSystem> = { [K in ProtectionField<T>]: boolean };

export interface EventFormOption<T extends OperatingSystem> {
  name: string;
  protectionField: ProtectionField<T>;
}

export interface SupplementalEventFormOption<T extends OperatingSystem> {
  name: string;
  protectionField: ProtectionField<T>;
  indented?: boolean;
  id?: string;
  title?: string;
  description?: string;
  tooltipText?: string;
  beta?: boolean;
  isDisabled?(policyConfig: UIPolicyConfig): boolean;
}

export interface EventCollectionCardProps<T extends OperatingSystem = OperatingSystem>
  extends PolicyFormComponentCommonProps {
  os: T;
  options: ReadonlyArray<EventFormOption<T>>;
  selection: EventFormSelection<T>;
  supplementalOptions?: ReadonlyArray<SupplementalEventFormOption<T>>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ANY = any;
interface EventCollectionCardComponent {
  <T extends OperatingSystem>(props: EventCollectionCardProps<T>, context?: ANY): ReactElement<
    ANY,
    ANY
  > | null;
  displayName?: string | undefined;
}

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
    const totalOptions = options.length;
    const policyOs = mapOperatingSystemToPolicyOsKey[os];

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
        mode={mode}
        selected={selectedCount > 0}
        rightCorner={
          <EuiText size="s" color="subdued" data-test-subj={getTestId('selectedCount')}>
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

        <div data-test-subj={getTestId('options')}>
          {options.map(({ name, protectionField }) => {
            const keyPath = `${policyOs}.events.${String(protectionField)}`;

            return (
              <EventCheckbox
                label={name}
                key={keyPath}
                keyPath={keyPath}
                policy={policy}
                onChange={onChange}
                disabled={!isEditMode}
                data-test-subj={getTestId(protectionField as string)}
              />
            );
          })}

          {selectedCount === 0 && !isEditMode && <div>{getEmptyValue()}</div>}
        </div>

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
              const keyPath = `${policyOs}.events.${String(protectionField)}`;
              const isChecked = get(policy, keyPath);
              const fieldString = protectionField as string;

              if (!isEditMode && !isChecked) {
                return null;
              }

              const isCheckboxDisabled = !isEditMode || (isDisabled ? isDisabled(policy) : false);

              return (
                <div
                  key={String(protectionField)}
                  style={indented ? { paddingLeft: theme.eui.euiSizeL } : {}}
                  data-test-subj={getTestId(`${fieldString}Container`)}
                >
                  {title && (
                    <>
                      <EuiSpacer size="m" />
                      <SettingCardHeader data-test-subj={getTestId(`${fieldString}Title`)}>
                        {title}
                      </SettingCardHeader>
                    </>
                  )}

                  {description && (
                    <>
                      <EuiSpacer size="s" />
                      <EuiText
                        size="xs"
                        color="subdued"
                        data-test-subj={getTestId(`${fieldString}Description`)}
                      >
                        {description}
                      </EuiText>
                    </>
                  )}

                  <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiSpacer size="s" />

                      <EventCheckbox
                        label={name}
                        key={keyPath}
                        keyPath={keyPath}
                        policy={policy}
                        onChange={onChange}
                        disabled={isCheckboxDisabled}
                        data-test-subj={getTestId(fieldString)}
                      />
                    </EuiFlexItem>

                    {tooltipText && (
                      <EuiFlexItem grow={false}>
                        <EuiIconTip
                          position="right"
                          content={tooltipText}
                          anchorProps={{ 'data-test-subj': getTestId(`${fieldString}TooltipIcon`) }}
                        />
                      </EuiFlexItem>
                    )}

                    {beta && (
                      <EuiFlexItem grow={false}>
                        <EuiBetaBadge
                          label="beta"
                          size="s"
                          data-test-subj={getTestId(`${fieldString}Badge`)}
                        />
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
) as EventCollectionCardComponent;
EventCollectionCard.displayName = 'EventCollectionCard';

interface EventCheckboxProps
  extends Omit<PolicyFormComponentCommonProps, 'mode'>,
    Pick<EuiCheckboxProps, 'label' | 'disabled'> {
  keyPath: string;
}

const EventCheckbox = memo<EventCheckboxProps>(
  ({ policy, onChange, label, keyPath, disabled, 'data-test-subj': dataTestSubj }) => {
    const isChecked: boolean = get(policy, keyPath);

    const checkboxOnChangeHandler = useCallback(
      (ev) => {
        const updatedPolicy = cloneDeep(policy);
        set(updatedPolicy, keyPath, ev.target.checked);

        onChange({ isValid: true, updatedPolicy });
      },
      [keyPath, onChange, policy]
    );

    return (
      <EuiCheckbox
        key={keyPath}
        id={keyPath}
        label={label}
        data-test-subj={dataTestSubj}
        checked={isChecked}
        onChange={checkboxOnChangeHandler}
        disabled={disabled}
      />
    );
  }
);
EventCheckbox.displayName = 'EventCheckbox';
