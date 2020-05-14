/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { safeLoad } from 'js-yaml';
import { getFlattenedObject } from '../../../../services';
import {
  NewDatasource,
  DatasourceInput,
  DatasourceInputStream,
  DatasourceConfigRecordEntry,
  PackageInfo,
  RegistryInput,
  RegistryVarsEntry,
} from '../../../../types';

type Errors = string[] | null;

type ValidationEntry = Record<string, Errors>;

export interface DatasourceConfigValidationResults {
  vars?: ValidationEntry;
}

export type DatasourceInputValidationResults = DatasourceConfigValidationResults & {
  streams?: Record<DatasourceInputStream['id'], DatasourceConfigValidationResults>;
};

export interface DatasourceValidationResults {
  name: Errors;
  description: Errors;
  inputs: Record<DatasourceInput['type'], DatasourceInputValidationResults> | null;
}

/*
 * Returns validation information for a given datasource configuration and package info
 * Note: this method assumes that `datasource` is correctly structured for the given package
 */
export const validateDatasource = (
  datasource: NewDatasource,
  packageInfo: PackageInfo
): DatasourceValidationResults => {
  const validationResults: DatasourceValidationResults = {
    name: null,
    description: null,
    inputs: {},
  };

  if (!datasource.name.trim()) {
    validationResults.name = [
      i18n.translate('xpack.ingestManager.datasourceValidation.nameRequiredErrorMessage', {
        defaultMessage: 'Name is required',
      }),
    ];
  }

  if (
    !packageInfo.datasources ||
    packageInfo.datasources.length === 0 ||
    !packageInfo.datasources[0] ||
    !packageInfo.datasources[0].inputs ||
    packageInfo.datasources[0].inputs.length === 0
  ) {
    validationResults.inputs = null;
    return validationResults;
  }

  const registryInputsByType: Record<
    string,
    RegistryInput
  > = packageInfo.datasources[0].inputs.reduce((inputs, registryInput) => {
    inputs[registryInput.type] = registryInput;
    return inputs;
  }, {} as Record<string, RegistryInput>);

  // Validate each datasource input with either its own config fields or streams
  datasource.inputs.forEach(input => {
    if (!input.vars && !input.streams) {
      return;
    }

    const inputValidationResults: DatasourceInputValidationResults = {
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
          ? validateDatasourceConfig(configEntry, inputVarsByName[name])
          : null;
        return results;
      }, {} as ValidationEntry);
    } else {
      delete inputValidationResults.vars;
    }

    // Validate each input stream with config fields
    if (input.streams.length) {
      input.streams.forEach(stream => {
        if (!stream.vars) {
          return;
        }

        const streamValidationResults: DatasourceConfigValidationResults = {
          vars: undefined,
        };

        const streamVarsByName = (
          (
            registryInputsByType[input.type].streams.find(
              registryStream => registryStream.dataset === stream.dataset
            ) || {}
          ).vars || []
        ).reduce((vars, registryVar) => {
          vars[registryVar.name] = registryVar;
          return vars;
        }, {} as Record<string, RegistryVarsEntry>);

        // Validate stream-level config fields
        streamValidationResults.vars = Object.entries(stream.vars).reduce(
          (results, [name, configEntry]) => {
            results[name] =
              input.enabled && stream.enabled
                ? validateDatasourceConfig(configEntry, streamVarsByName[name])
                : null;
            return results;
          },
          {} as ValidationEntry
        );

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

const validateDatasourceConfig = (
  configEntry: DatasourceConfigRecordEntry,
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
        i18n.translate('xpack.ingestManager.datasourceValidation.requiredErrorMessage', {
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
        i18n.translate('xpack.ingestManager.datasourceValidation.invalidYamlFormatErrorMessage', {
          defaultMessage: 'Invalid YAML format',
        })
      );
    }
  }

  if (varDef.multi) {
    if (parsedValue && !Array.isArray(parsedValue)) {
      errors.push(
        i18n.translate('xpack.ingestManager.datasourceValidation.invalidArrayErrorMessage', {
          defaultMessage: 'Invalid format',
        })
      );
    }
    if (
      varDef.required &&
      (!parsedValue || (Array.isArray(parsedValue) && parsedValue.length === 0))
    ) {
      errors.push(
        i18n.translate('xpack.ingestManager.datasourceValidation.requiredErrorMessage', {
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
    | DatasourceValidationResults
    | DatasourceInputValidationResults
    | DatasourceConfigValidationResults
) => {
  const flattenedValidation = getFlattenedObject(validationResults);
  return !!Object.entries(flattenedValidation).find(([, value]) => !!value);
};
