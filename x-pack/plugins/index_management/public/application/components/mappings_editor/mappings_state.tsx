/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useReducer, useEffect, createContext, useContext, useMemo, useRef } from 'react';

import {
  reducer,
  MappingsConfiguration,
  MappingsFields,
  MappingsTemplates,
  State,
  Dispatch,
} from './reducer';
import { Field } from './types';
import { normalize, deNormalize, stripUndefinedValues } from './lib';

type Mappings = MappingsTemplates &
  MappingsConfiguration & {
    properties: MappingsFields;
  };

export interface Types {
  Mappings: Mappings;
  MappingsConfiguration: MappingsConfiguration;
  MappingsFields: MappingsFields;
  MappingsTemplates: MappingsTemplates;
}

export interface OnUpdateHandlerArg {
  isValid?: boolean;
  getData: () => Mappings;
  validate: () => Promise<boolean>;
}

export type OnUpdateHandler = (arg: OnUpdateHandlerArg) => void;

const StateContext = createContext<State | undefined>(undefined);
const DispatchContext = createContext<Dispatch | undefined>(undefined);

export interface Props {
  children: (params: { state: State }) => React.ReactNode;
  value: {
    templates: MappingsTemplates;
    configuration: MappingsConfiguration;
    fields: { [key: string]: Field };
  };
  onChange: OnUpdateHandler;
}

export const MappingsState = React.memo(({ children, onChange, value }: Props) => {
  const didMountRef = useRef(false);

  const parsedFieldsDefaultValue = useMemo(() => normalize(value.fields), [value.fields]);

  const initialState: State = {
    isValid: true,
    configuration: {
      defaultValue: value.configuration,
      data: {
        raw: value.configuration,
        format: () => value.configuration,
      },
      validate: () => Promise.resolve(true),
    },
    templates: {
      defaultValue: value.templates,
      data: {
        raw: value.templates,
        format: () => value.templates,
      },
      validate: () => Promise.resolve(true),
    },
    fields: parsedFieldsDefaultValue,
    documentFields: {
      status: parsedFieldsDefaultValue.rootLevelFields.length === 0 ? 'creatingField' : 'idle',
      editor: 'default',
    },
    fieldsJsonEditor: {
      format: () => ({}),
      isValid: true,
    },
    search: {
      term: '',
      result: [],
    },
  };

  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    // If we are creating a new field, but haven't entered any name
    // it is valid and we can byPass its form validation (that requires a "name" to be defined)
    const isFieldFormVisible = state.fieldForm !== undefined;
    const emptyNameValue =
      isFieldFormVisible &&
      state.fieldForm!.data.raw.name !== undefined &&
      state.fieldForm!.data.raw.name.trim() === '';

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

        const configurationData = state.configuration.data.format();
        const templatesData = state.templates.data.format();

        return {
          ...stripUndefinedValues({
            ...configurationData,
            ...templatesData,
          }),
          properties: fields,
        };
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
  }, [state, onChange]);

  useEffect(() => {
    /**
     * If the value has changed that probably means that we have loaded
     * new data from JSON. We need to update our state with the new mappings.
     */
    if (didMountRef.current) {
      dispatch({
        type: 'editor.replaceMappings',
        value: {
          configuration: value.configuration,
          templates: value.templates,
          fields: parsedFieldsDefaultValue,
        },
      });
    } else {
      didMountRef.current = true;
    }
  }, [value, parsedFieldsDefaultValue]);

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>{children({ state })}</DispatchContext.Provider>
    </StateContext.Provider>
  );
});

export const useMappingsState = () => {
  const ctx = useContext(StateContext);
  if (ctx === undefined) {
    throw new Error('useMappingsState must be used within a <MappingsState>');
  }
  return ctx;
};

export const useDispatch = () => {
  const ctx = useContext(DispatchContext);
  if (ctx === undefined) {
    throw new Error('useDispatch must be used within a <MappingsState>');
  }
  return ctx;
};
