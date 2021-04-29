/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEventHandler, memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSuperSelect,
  EuiSuperSelectOption,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiFormProps } from '@elastic/eui/src/components/form/form';
import {
  ConditionEntryField,
  EffectScope,
  MacosLinuxConditionEntry,
  MaybeImmutable,
  NewTrustedApp,
  OperatingSystem,
} from '../../../../../../common/endpoint/types';
import { isValidHash } from '../../../../../../common/endpoint/service/trusted_apps/validations';

import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import {
  isGlobalEffectScope,
  isMacosLinuxTrustedAppCondition,
  isPolicyEffectScope,
  isWindowsTrustedAppCondition,
} from '../../state/type_guards';
import { defaultConditionEntry } from '../../store/builders';
import { OS_TITLES } from '../translations';
import { LogicalConditionBuilder, LogicalConditionBuilderProps } from './logical_condition';
import {
  EffectedPolicySelect,
  EffectedPolicySelection,
  EffectedPolicySelectProps,
} from './effected_policy_select';
import { useTestIdGenerator } from '../../../../components/hooks/use_test_id_generator';

const OPERATING_SYSTEMS: readonly OperatingSystem[] = [
  OperatingSystem.MAC,
  OperatingSystem.WINDOWS,
  OperatingSystem.LINUX,
];

interface FieldValidationState {
  /** If this fields state is invalid. Drives display of errors on the UI */
  isInvalid: boolean;
  errors: string[];
  warnings: string[];
}
interface ValidationResult {
  /** Overall indicator if form is valid */
  isValid: boolean;

  /** Individual form field validations */
  result: Partial<
    {
      [key in keyof NewTrustedApp]: FieldValidationState;
    }
  >;
}

const addResultToValidation = (
  validation: ValidationResult,
  field: keyof NewTrustedApp,
  type: 'warnings' | 'errors',
  resultValue: string
) => {
  if (!validation.result[field]) {
    validation.result[field] = {
      isInvalid: false,
      errors: [],
      warnings: [],
    };
  }
  validation.result[field]![type].push(resultValue);
  validation.result[field]!.isInvalid = true;
};

const validateFormValues = (values: MaybeImmutable<NewTrustedApp>): ValidationResult => {
  let isValid: ValidationResult['isValid'] = true;
  const validation: ValidationResult = {
    isValid,
    result: {},
  };

  // Name field
  if (!values.name.trim()) {
    isValid = false;
    addResultToValidation(
      validation,
      'name',
      'errors',
      i18n.translate('xpack.securitySolution.trustedapps.create.nameRequiredMsg', {
        defaultMessage: 'Name is required',
      })
    );
  }

  if (!values.os) {
    isValid = false;
    addResultToValidation(
      validation,
      'os',
      'errors',
      i18n.translate('xpack.securitySolution.trustedapps.create.osRequiredMsg', {
        defaultMessage: 'Operating System is required',
      })
    );
  }

  if (!values.entries.length) {
    isValid = false;
    addResultToValidation(
      validation,
      'entries',
      'errors',
      i18n.translate('xpack.securitySolution.trustedapps.create.conditionRequiredMsg', {
        defaultMessage: 'At least one Field definition is required',
      })
    );
  } else {
    values.entries.forEach((entry, index) => {
      if (!entry.field || !entry.value.trim()) {
        isValid = false;
        addResultToValidation(
          validation,
          'entries',
          'errors',
          i18n.translate(
            'xpack.securitySolution.trustedapps.create.conditionFieldValueRequiredMsg',
            {
              defaultMessage: '[{row}] Field entry must have a value',
              values: { row: index + 1 },
            }
          )
        );
      } else if (entry.field === ConditionEntryField.HASH && !isValidHash(entry.value)) {
        isValid = false;
        addResultToValidation(
          validation,
          'entries',
          'errors',
          i18n.translate('xpack.securitySolution.trustedapps.create.conditionFieldInvalidHashMsg', {
            defaultMessage: '[{row}] Invalid hash value',
            values: { row: index + 1 },
          })
        );
      }
    });
  }

  validation.isValid = isValid;
  return validation;
};

export interface TrustedAppFormState {
  isValid: boolean;
  item: NewTrustedApp;
}

export type CreateTrustedAppFormProps = Pick<
  EuiFormProps,
  'className' | 'data-test-subj' | 'isInvalid' | 'error' | 'invalidCallout'
> & {
  /** The trusted app values that will be passed to the form */
  trustedApp: MaybeImmutable<NewTrustedApp>;
  onChange: (state: TrustedAppFormState) => void;
  /** Setting passed on to the EffectedPolicySelect component */
  policies: Pick<EffectedPolicySelectProps, 'options' | 'isLoading'>;
  /** if form should be shown full width of parent container */
  fullWidth?: boolean;
};
export const CreateTrustedAppForm = memo<CreateTrustedAppFormProps>(
  ({ fullWidth, onChange, trustedApp: _trustedApp, policies = { options: [] }, ...formProps }) => {
    const trustedApp = _trustedApp as NewTrustedApp;

    const dataTestSubj = formProps['data-test-subj'];

    const isTrustedAppsByPolicyEnabled = useIsExperimentalFeatureEnabled(
      'trustedAppsByPolicyEnabled'
    );

    const osOptions: Array<EuiSuperSelectOption<OperatingSystem>> = useMemo(
      () => OPERATING_SYSTEMS.map((os) => ({ value: os, inputDisplay: OS_TITLES[os] })),
      []
    );

    // We create local state for the list of policies because we want the selected policies to
    // persist while the user is on the form and possibly toggling between global/non-global
    const [selectedPolicies, setSelectedPolicies] = useState<EffectedPolicySelection>({
      isGlobal: isGlobalEffectScope(trustedApp.effectScope),
      selected: [],
    });

    const [validationResult, setValidationResult] = useState<ValidationResult>(() =>
      validateFormValues(trustedApp)
    );

    const [wasVisited, setWasVisited] = useState<
      Partial<
        {
          [key in keyof NewTrustedApp]: boolean;
        }
      >
    >({});

    const getTestId = useTestIdGenerator(dataTestSubj);

    const notifyOfChange = useCallback(
      (updatedFormValues: TrustedAppFormState['item']) => {
        const updatedValidationResult = validateFormValues(updatedFormValues);

        setValidationResult(updatedValidationResult);

        onChange({
          item: updatedFormValues,
          isValid: updatedValidationResult.isValid,
        });
      },
      [onChange]
    );

    const handleAndClick = useCallback(() => {
      if (trustedApp.os === OperatingSystem.WINDOWS) {
        notifyOfChange({
          ...trustedApp,
          entries: [...trustedApp.entries, defaultConditionEntry()].filter(
            isWindowsTrustedAppCondition
          ),
        });
      } else {
        notifyOfChange({
          ...trustedApp,
          entries: [
            ...trustedApp.entries.filter(isMacosLinuxTrustedAppCondition),
            defaultConditionEntry(),
          ],
        });
      }
    }, [notifyOfChange, trustedApp]);

    const handleDomChangeEvents = useCallback<
      ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>
    >(
      ({ target: { name, value } }) => {
        notifyOfChange({
          ...trustedApp,
          [name]: value,
        });
      },
      [notifyOfChange, trustedApp]
    );

    // Handles keeping track if an input form field has been visited
    const handleDomBlurEvents = useCallback<ChangeEventHandler<HTMLInputElement>>(
      ({ target: { name } }) => {
        setWasVisited((prevState) => {
          return {
            ...prevState,
            [name]: true,
          };
        });
      },
      []
    );

    const handleOsChange = useCallback<(v: OperatingSystem) => void>(
      (newOsValue) => {
        setWasVisited((prevState) => {
          return {
            ...prevState,
            os: true,
          };
        });

        const updatedState: NewTrustedApp = {
          ...trustedApp,
          entries: [],
          os: newOsValue,
        };
        if (updatedState.os !== OperatingSystem.WINDOWS) {
          updatedState.entries.push(
            ...(trustedApp.entries.filter((entry) =>
              isMacosLinuxTrustedAppCondition(entry)
            ) as MacosLinuxConditionEntry[])
          );
          if (updatedState.entries.length === 0) {
            updatedState.entries.push(defaultConditionEntry());
          }
        } else {
          updatedState.entries.push(...trustedApp.entries);
        }

        notifyOfChange(updatedState);
      },
      [notifyOfChange, trustedApp]
    );

    const handleEntryRemove = useCallback(
      (entry: NewTrustedApp['entries'][0]) => {
        notifyOfChange({
          ...trustedApp,
          entries: trustedApp.entries.filter((item) => item !== entry),
        } as NewTrustedApp);
      },
      [notifyOfChange, trustedApp]
    );

    const handleEntryChange = useCallback<LogicalConditionBuilderProps['onEntryChange']>(
      (newEntry, oldEntry) => {
        if (trustedApp.os === OperatingSystem.WINDOWS) {
          notifyOfChange({
            ...trustedApp,
            entries: trustedApp.entries.map((item) => {
              if (item === oldEntry) {
                return newEntry;
              }
              return item;
            }),
          } as NewTrustedApp);
        } else {
          notifyOfChange({
            ...trustedApp,
            entries: trustedApp.entries.map((item) => {
              if (item === oldEntry) {
                return newEntry;
              }
              return item;
            }),
          } as NewTrustedApp);
        }
      },
      [notifyOfChange, trustedApp]
    );

    const handleConditionBuilderOnVisited: LogicalConditionBuilderProps['onVisited'] = useCallback(() => {
      setWasVisited((prevState) => {
        return {
          ...prevState,
          entries: true,
        };
      });
    }, []);

    const handlePolicySelectChange: EffectedPolicySelectProps['onChange'] = useCallback(
      (selection) => {
        setSelectedPolicies(() => selection);

        let newEffectedScope: EffectScope;

        if (selection.isGlobal) {
          newEffectedScope = {
            type: 'global',
          };
        } else {
          newEffectedScope = {
            type: 'policy',
            policies: selection.selected.map((policy) => policy.id),
          };
        }

        notifyOfChange({
          ...trustedApp,
          effectScope: newEffectedScope,
        });
      },
      [notifyOfChange, trustedApp]
    );

    // Anytime the form values change, re-validate
    useEffect(() => {
      setValidationResult((prevState) => {
        const newResults = validateFormValues(trustedApp);

        // Only notify if the overall validation result is different
        if (newResults.isValid !== prevState.isValid) {
          notifyOfChange(trustedApp);
        }

        return newResults;
      });
    }, [notifyOfChange, trustedApp]);

    // Anytime the TrustedApp has an effective scope of `policies`, then ensure that
    // those polices are selected in the UI while at teh same time preserving prior
    // selections (UX requirement)
    useEffect(() => {
      setSelectedPolicies((currentSelection) => {
        if (isPolicyEffectScope(trustedApp.effectScope) && policies.options.length > 0) {
          const missingSelectedPolicies: EffectedPolicySelectProps['selected'] = [];

          for (const policyId of trustedApp.effectScope.policies) {
            if (
              !currentSelection.selected.find(
                (currentlySelectedPolicyItem) => currentlySelectedPolicyItem.id === policyId
              )
            ) {
              const newSelectedPolicy = policies.options.find((policy) => policy.id === policyId);
              if (newSelectedPolicy) {
                missingSelectedPolicies.push(newSelectedPolicy);
              }
            }
          }

          if (missingSelectedPolicies.length) {
            return {
              ...currentSelection,
              selected: [...currentSelection.selected, ...missingSelectedPolicies],
            };
          }
        }

        return currentSelection;
      });
    }, [policies.options, trustedApp.effectScope]);

    return (
      <EuiForm {...formProps} component="div">
        <EuiFormRow
          label={i18n.translate('xpack.securitySolution.trustedapps.create.name', {
            defaultMessage: 'Name your trusted application',
          })}
          fullWidth={fullWidth}
          data-test-subj={getTestId('nameRow')}
          isInvalid={wasVisited?.name && validationResult.result.name?.isInvalid}
          error={validationResult.result.name?.errors}
        >
          <EuiFieldText
            name="name"
            value={trustedApp.name}
            onChange={handleDomChangeEvents}
            onBlur={handleDomBlurEvents}
            fullWidth
            required
            maxLength={256}
            data-test-subj={getTestId('nameTextField')}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.securitySolution.trustedapps.create.os', {
            defaultMessage: 'Select operating system',
          })}
          fullWidth={fullWidth}
          data-test-subj={getTestId('OsRow')}
          isInvalid={wasVisited?.os && validationResult.result.os?.isInvalid}
          error={validationResult.result.os?.errors}
        >
          <EuiSuperSelect
            name="os"
            options={osOptions}
            valueOfSelected={trustedApp.os}
            onChange={handleOsChange}
            fullWidth
            data-test-subj={getTestId('osSelectField')}
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth={fullWidth}
          data-test-subj={getTestId('conditionsRow')}
          isInvalid={wasVisited?.entries && validationResult.result.entries?.isInvalid}
          error={validationResult.result.entries?.errors}
        >
          <LogicalConditionBuilder
            entries={trustedApp.entries}
            os={trustedApp.os}
            onAndClicked={handleAndClick}
            onEntryRemove={handleEntryRemove}
            onEntryChange={handleEntryChange}
            onVisited={handleConditionBuilderOnVisited}
            data-test-subj={getTestId('conditionsBuilder')}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.securitySolution.trustedapps.create.description', {
            defaultMessage: 'Description',
          })}
          fullWidth={fullWidth}
          data-test-subj={getTestId('descriptionRow')}
        >
          <EuiTextArea
            name="description"
            value={trustedApp.description}
            onChange={handleDomChangeEvents}
            fullWidth
            compressed={isTrustedAppsByPolicyEnabled ? true : false}
            maxLength={256}
            data-test-subj={getTestId('descriptionField')}
          />
        </EuiFormRow>

        {isTrustedAppsByPolicyEnabled ? (
          <>
            <EuiHorizontalRule />
            <EuiFormRow fullWidth={fullWidth} data-test-subj={getTestId('policySelection')}>
              <EffectedPolicySelect
                isGlobal={isGlobalEffectScope(trustedApp.effectScope)}
                selected={selectedPolicies.selected}
                options={policies.options}
                onChange={handlePolicySelectChange}
                isLoading={policies?.isLoading}
                data-test-subj={getTestId('effectedPolicies')}
              />
            </EuiFormRow>
          </>
        ) : null}
      </EuiForm>
    );
  }
);

CreateTrustedAppForm.displayName = 'NewTrustedAppForm';
