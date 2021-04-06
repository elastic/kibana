/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';

import {
  Field,
  Mappings,
  MappingsConfiguration,
  MappingsTemplates,
  OnUpdateHandler,
  RuntimeFields,
} from './types';
import {
  normalize,
  deNormalize,
  stripUndefinedValues,
  normalizeRuntimeFields,
  deNormalizeRuntimeFields,
} from './lib';
import { useMappingsState, useDispatch } from './mappings_state_context';

interface Args {
  onChange: OnUpdateHandler;
  value?: {
    templates: MappingsTemplates;
    configuration: MappingsConfiguration;
    fields: { [key: string]: Field };
    runtime: RuntimeFields;
  };
}

export const useMappingsStateListener = ({ onChange, value }: Args) => {
  const state = useMappingsState();
  const dispatch = useDispatch();

  const { fields: mappedFields, runtime: runtimeFields } = value ?? {};

  const parsedFieldsDefaultValue = useMemo(() => normalize(mappedFields), [mappedFields]);
  const parsedRuntimeFieldsDefaultValue = useMemo(() => normalizeRuntimeFields(runtimeFields), [
    runtimeFields,
  ]);

  useEffect(() => {
    // If we are creating a new field, but haven't entered any name
    // it is valid and we can byPass its form validation (that requires a "name" to be defined)
    const isFieldFormVisible = state.fieldForm !== undefined;
    const emptyNameValue =
      isFieldFormVisible &&
      (state.fieldForm!.data.internal.name === undefined ||
        state.fieldForm!.data.internal.name.trim() === '');

    const bypassFieldFormValidation =
      state.documentFields.status === 'creatingField' && emptyNameValue;

    onChange({
      // Output a mappings object from the user's input.
      getData: () => {
        // Pull the mappings properties from the current editor
        const fields =
          state.documentFields.editor === 'json'
            ? state.fieldsJsonEditor.format()
            : deNormalize(state.fields);

        // Get the runtime fields
        const runtime = deNormalizeRuntimeFields(state.runtimeFields);

        const configurationData = state.configuration.data.format();
        const templatesData = state.templates.data.format();

        const output = {
          ...stripUndefinedValues({
            ...configurationData,
            ...templatesData,
          }),
        };

        // Mapped fields
        if (fields && Object.keys(fields).length > 0) {
          output.properties = fields;
        }

        // Runtime fields
        if (runtime && Object.keys(runtime).length > 0) {
          output.runtime = runtime;
        }

        return Object.keys(output).length > 0 ? (output as Mappings) : undefined;
      },
      validate: async () => {
        const configurationFormValidator =
          state.configuration.submitForm !== undefined
            ? new Promise(async (resolve) => {
                const { isValid } = await state.configuration.submitForm!();
                resolve(isValid);
              })
            : Promise.resolve(true);

        const templatesFormValidator =
          state.templates.submitForm !== undefined
            ? new Promise(async (resolve) => {
                const { isValid } = await state.templates.submitForm!();
                resolve(isValid);
              })
            : Promise.resolve(true);

        const promisesToValidate = [configurationFormValidator, templatesFormValidator];

        if (state.fieldForm !== undefined && !bypassFieldFormValidation) {
          promisesToValidate.push(state.fieldForm.validate());
        }

        return Promise.all(promisesToValidate).then((validationArray) => {
          const isValid = validationArray.every(Boolean) && state.fieldsJsonEditor.isValid;
          dispatch({ type: 'validity:update', value: isValid });
          return isValid;
        });
      },
      isValid: state.isValid,
    });
  }, [state, onChange, dispatch]);

  useEffect(() => {
    /**
     * If the value has changed that probably means that we have loaded
     * new data from JSON. We need to update our state with the new mappings.
     */
    if (value === undefined) {
      return;
    }

    dispatch({
      type: 'editor.replaceMappings',
      value: {
        configuration: value.configuration,
        templates: value.templates,
        fields: parsedFieldsDefaultValue,
        documentFields: {
          status: parsedFieldsDefaultValue.rootLevelFields.length === 0 ? 'creatingField' : 'idle',
          editor: 'default',
        },
        runtimeFields: parsedRuntimeFieldsDefaultValue,
      },
    });
  }, [value, parsedFieldsDefaultValue, dispatch, parsedRuntimeFieldsDefaultValue]);
};
