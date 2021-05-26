/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { safeLoad } from 'js-yaml';
import { keyBy } from 'lodash';

import { getFlattenedObject, isValidNamespace } from '../../../../services';
import type {
  NewPackagePolicy,
  PackagePolicyInput,
  PackagePolicyInputStream,
  PackagePolicyConfigRecordEntry,
  PackageInfo,
  RegistryInput,
  RegistryStream,
  RegistryVarsEntry,
} from '../../../../types';

type Errors = string[] | null;

type ValidationEntry = Record<string, Errors>;

export interface PackagePolicyConfigValidationResults {
  vars?: ValidationEntry;
}

export type PackagePolicyInputValidationResults = PackagePolicyConfigValidationResults & {
  streams?: Record<PackagePolicyInputStream['id'], PackagePolicyConfigValidationResults>;
};

export type PackagePolicyValidationResults = {
  name: Errors;
  description: Errors;
  namespace: Errors;
  inputs: Record<PackagePolicyInput['type'], PackagePolicyInputValidationResults> | null;
} & PackagePolicyConfigValidationResults;

/*
 * Returns validation information for a given package policy and package info
 * Note: this method assumes that `packagePolicy` is correctly structured for the given package
 */
export const validatePackagePolicy = (
  packagePolicy: NewPackagePolicy,
  packageInfo: PackageInfo
): PackagePolicyValidationResults => {
  const validationResults: PackagePolicyValidationResults = {
    name: null,
    description: null,
    namespace: null,
    inputs: {},
  };
  const namespaceValidation = isValidNamespace(packagePolicy.namespace);

  if (!packagePolicy.name.trim()) {
    validationResults.name = [
      i18n.translate('xpack.fleet.packagePolicyValidation.nameRequiredErrorMessage', {
        defaultMessage: 'Name is required',
      }),
    ];
  }

  if (!namespaceValidation.valid && namespaceValidation.error) {
    validationResults.namespace = [namespaceValidation.error];
  }

  // Validate package-level vars
  const packageVarsByName = keyBy(packageInfo.vars || [], 'name');
  const packageVars = Object.entries(packagePolicy.vars || {});
  if (packageVars.length) {
    validationResults.vars = packageVars.reduce((results, [name, varEntry]) => {
      results[name] = validatePackagePolicyConfig(varEntry, packageVarsByName[name]);
      return results;
    }, {} as ValidationEntry);
  }

  if (
    !packageInfo.policy_templates ||
    packageInfo.policy_templates.length === 0 ||
    !packageInfo.policy_templates[0] ||
    !packageInfo.policy_templates[0].inputs ||
    packageInfo.policy_templates[0].inputs.length === 0
  ) {
    validationResults.inputs = null;
    return validationResults;
  }

  const registryInputsByType: Record<
    string,
    RegistryInput
  > = packageInfo.policy_templates[0].inputs.reduce((inputs, registryInput) => {
    inputs[registryInput.type] = registryInput;
    return inputs;
  }, {} as Record<string, RegistryInput>);

  const registryStreamsByDataset: Record<string, RegistryStream[]> = (
    packageInfo.data_streams || []
  ).reduce((dataStreams, registryDataStream) => {
    dataStreams[registryDataStream.dataset] = registryDataStream.streams || [];
    return dataStreams;
  }, {} as Record<string, RegistryStream[]>);

  // Validate each package policy input with either its own config fields or streams
  packagePolicy.inputs.forEach((input) => {
    if (!input.vars && !input.streams) {
      return;
    }

    const inputValidationResults: PackagePolicyInputValidationResults = {
      vars: undefined,
      streams: {},
    };

    const inputVarsByName = (registryInputsByType[input.type].vars || []).reduce(
      (vars, registryVar) => {
        vars[registryVar.name] = registryVar;
        return vars;
      },
      {} as Record<string, RegistryVarsEntry>
    );

    // Validate input-level config fields
    const inputConfigs = Object.entries(input.vars || {});
    if (inputConfigs.length) {
      inputValidationResults.vars = inputConfigs.reduce((results, [name, configEntry]) => {
        results[name] = input.enabled
          ? validatePackagePolicyConfig(configEntry, inputVarsByName[name])
          : null;
        return results;
      }, {} as ValidationEntry);
    } else {
      delete inputValidationResults.vars;
    }

    // Validate each input stream with config fields
    if (input.streams.length) {
      input.streams.forEach((stream) => {
        const streamValidationResults: PackagePolicyConfigValidationResults = {};

        // Validate stream-level config fields
        if (stream.vars) {
          const streamVarsByName = (
            (
              registryStreamsByDataset[stream.data_stream.dataset].find(
                (registryStream) => registryStream.input === input.type
              ) || {}
            ).vars || []
          ).reduce((vars, registryVar) => {
            vars[registryVar.name] = registryVar;
            return vars;
          }, {} as Record<string, RegistryVarsEntry>);
          streamValidationResults.vars = Object.entries(stream.vars).reduce(
            (results, [name, configEntry]) => {
              results[name] =
                input.enabled && stream.enabled
                  ? validatePackagePolicyConfig(configEntry, streamVarsByName[name])
                  : null;
              return results;
            },
            {} as ValidationEntry
          );
        }

        inputValidationResults.streams![stream.data_stream.dataset] = streamValidationResults;
      });
    } else {
      delete inputValidationResults.streams;
    }

    if (inputValidationResults.vars || inputValidationResults.streams) {
      validationResults.inputs![input.type] = inputValidationResults;
    }
  });

  if (Object.entries(validationResults.inputs!).length === 0) {
    validationResults.inputs = null;
  }
  return validationResults;
};

export const validatePackagePolicyConfig = (
  configEntry: PackagePolicyConfigRecordEntry,
  varDef: RegistryVarsEntry
): string[] | null => {
  const errors = [];
  const { value } = configEntry;
  let parsedValue: any = value;

  if (typeof value === 'string') {
    parsedValue = value.trim();
  }

  if (varDef.required) {
    if (parsedValue === undefined || (typeof parsedValue === 'string' && !parsedValue)) {
      errors.push(
        i18n.translate('xpack.fleet.packagePolicyValidation.requiredErrorMessage', {
          defaultMessage: '{fieldName} is required',
          values: {
            fieldName: varDef.title || varDef.name,
          },
        })
      );
    }
  }

  if (varDef.type === 'yaml') {
    try {
      parsedValue = safeLoad(value);
    } catch (e) {
      errors.push(
        i18n.translate('xpack.fleet.packagePolicyValidation.invalidYamlFormatErrorMessage', {
          defaultMessage: 'Invalid YAML format',
        })
      );
    }
  }

  if (varDef.multi) {
    if (parsedValue && !Array.isArray(parsedValue)) {
      errors.push(
        i18n.translate('xpack.fleet.packagePolicyValidation.invalidArrayErrorMessage', {
          defaultMessage: 'Invalid format',
        })
      );
    }
    if (
      varDef.required &&
      (!parsedValue || (Array.isArray(parsedValue) && parsedValue.length === 0))
    ) {
      errors.push(
        i18n.translate('xpack.fleet.packagePolicyValidation.requiredErrorMessage', {
          defaultMessage: '{fieldName} is required',
          values: {
            fieldName: varDef.title || varDef.name,
          },
        })
      );
    }
    if (varDef.type === 'text' && parsedValue && Array.isArray(parsedValue)) {
      const invalidStrings = parsedValue.filter((cand) => /^[*&]/.test(cand));
      // only show one error if multiple strings in array are invalid
      if (invalidStrings.length > 0) {
        errors.push(
          i18n.translate('xpack.fleet.packagePolicyValidation.quoteStringErrorMessage', {
            defaultMessage:
              'Strings starting with special YAML characters like * or & need to be enclosed in double quotes.',
          })
        );
      }
    }
  }

  if (varDef.type === 'text' && parsedValue && !Array.isArray(parsedValue)) {
    if (/^[*&]/.test(parsedValue)) {
      errors.push(
        i18n.translate('xpack.fleet.packagePolicyValidation.quoteStringErrorMessage', {
          defaultMessage:
            'Strings starting with special YAML characters like * or & need to be enclosed in double quotes.',
        })
      );
    }
  }

  return errors.length ? errors : null;
};

export const countValidationErrors = (
  validationResults:
    | PackagePolicyValidationResults
    | PackagePolicyInputValidationResults
    | PackagePolicyConfigValidationResults
): number => {
  const flattenedValidation = getFlattenedObject(validationResults);
  const errors = Object.values(flattenedValidation).filter((value) => Boolean(value)) || [];
  return errors.length;
};

export const validationHasErrors = (
  validationResults:
    | PackagePolicyValidationResults
    | PackagePolicyInputValidationResults
    | PackagePolicyConfigValidationResults
): boolean => {
  return countValidationErrors(validationResults) > 0;
};
