/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { safeLoad } from 'js-yaml';
import { getFlattenedObject } from '../../../../services';
import {
  NewPackageConfig,
  PackageConfigInput,
  PackageConfigInputStream,
  PackageConfigConfigRecordEntry,
  PackageInfo,
  RegistryInput,
  RegistryStream,
  RegistryVarsEntry,
} from '../../../../types';

type Errors = string[] | null;

type ValidationEntry = Record<string, Errors>;

export interface PackageConfigConfigValidationResults {
  vars?: ValidationEntry;
}

export type PackageConfigInputValidationResults = PackageConfigConfigValidationResults & {
  streams?: Record<PackageConfigInputStream['id'], PackageConfigConfigValidationResults>;
};

export interface PackageConfigValidationResults {
  name: Errors;
  description: Errors;
  namespace: Errors;
  inputs: Record<PackageConfigInput['type'], PackageConfigInputValidationResults> | null;
}

/*
 * Returns validation information for a given package config and package info
 * Note: this method assumes that `packageConfig` is correctly structured for the given package
 */
export const validatePackageConfig = (
  packageConfig: NewPackageConfig,
  packageInfo: PackageInfo
): PackageConfigValidationResults => {
  const validationResults: PackageConfigValidationResults = {
    name: null,
    description: null,
    namespace: null,
    inputs: {},
  };

  if (!packageConfig.name.trim()) {
    validationResults.name = [
      i18n.translate('xpack.ingestManager.packageConfigValidation.nameRequiredErrorMessage', {
        defaultMessage: 'Name is required',
      }),
    ];
  }

  if (!packageConfig.namespace.trim()) {
    validationResults.namespace = [
      i18n.translate('xpack.ingestManager.packageConfigValidation.namespaceRequiredErrorMessage', {
        defaultMessage: 'Namespace is required',
      }),
    ];
  }

  if (
    !packageInfo.config_templates ||
    packageInfo.config_templates.length === 0 ||
    !packageInfo.config_templates[0] ||
    !packageInfo.config_templates[0].inputs ||
    packageInfo.config_templates[0].inputs.length === 0
  ) {
    validationResults.inputs = null;
    return validationResults;
  }

  const registryInputsByType: Record<
    string,
    RegistryInput
  > = packageInfo.config_templates[0].inputs.reduce((inputs, registryInput) => {
    inputs[registryInput.type] = registryInput;
    return inputs;
  }, {} as Record<string, RegistryInput>);

  const registryStreamsByDataset: Record<string, RegistryStream[]> = (
    packageInfo.datasets || []
  ).reduce((datasets, registryDataset) => {
    datasets[registryDataset.name] = registryDataset.streams || [];
    return datasets;
  }, {} as Record<string, RegistryStream[]>);

  // Validate each package config input with either its own config fields or streams
  packageConfig.inputs.forEach((input) => {
    if (!input.vars && !input.streams) {
      return;
    }

    const inputValidationResults: PackageConfigInputValidationResults = {
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
          ? validatePackageConfigConfig(configEntry, inputVarsByName[name])
          : null;
        return results;
      }, {} as ValidationEntry);
    } else {
      delete inputValidationResults.vars;
    }

    // Validate each input stream with config fields
    if (input.streams.length) {
      input.streams.forEach((stream) => {
        const streamValidationResults: PackageConfigConfigValidationResults = {};

        // Validate stream-level config fields
        if (stream.vars) {
          const streamVarsByName = (
            (
              registryStreamsByDataset[stream.dataset.name].find(
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
                  ? validatePackageConfigConfig(configEntry, streamVarsByName[name])
                  : null;
              return results;
            },
            {} as ValidationEntry
          );
        }

        inputValidationResults.streams![stream.id] = streamValidationResults;
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

const validatePackageConfigConfig = (
  configEntry: PackageConfigConfigRecordEntry,
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
        i18n.translate('xpack.ingestManager.packageConfigValidation.requiredErrorMessage', {
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
        i18n.translate(
          'xpack.ingestManager.packageConfigValidation.invalidYamlFormatErrorMessage',
          {
            defaultMessage: 'Invalid YAML format',
          }
        )
      );
    }
  }

  if (varDef.multi) {
    if (parsedValue && !Array.isArray(parsedValue)) {
      errors.push(
        i18n.translate('xpack.ingestManager.packageConfigValidation.invalidArrayErrorMessage', {
          defaultMessage: 'Invalid format',
        })
      );
    }
    if (
      varDef.required &&
      (!parsedValue || (Array.isArray(parsedValue) && parsedValue.length === 0))
    ) {
      errors.push(
        i18n.translate('xpack.ingestManager.packageConfigValidation.requiredErrorMessage', {
          defaultMessage: '{fieldName} is required',
          values: {
            fieldName: varDef.title || varDef.name,
          },
        })
      );
    }
  }

  return errors.length ? errors : null;
};

export const validationHasErrors = (
  validationResults:
    | PackageConfigValidationResults
    | PackageConfigInputValidationResults
    | PackageConfigConfigValidationResults
) => {
  const flattenedValidation = getFlattenedObject(validationResults);

  return !!Object.entries(flattenedValidation).find(([, value]) => !!value);
};
