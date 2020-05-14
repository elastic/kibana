/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect } from 'react';

import {
  EuiFormRow,
  EuiFieldText,
  EuiComboBox,
  EuiCodeEditor,
  EuiButton,
  EuiSpacer,
  EuiForm,
} from '@elastic/eui';

interface MyForm {
  fields: {
    name: string;
    type: string;
  };
  seeds: Array<{ label: string }>;
  _meta: string; // string is the **internal** state, we probably want a JSON object out of the form
}

interface FormErrors {
  fields: {
    name: string | null;
    type: string | null;
  };
  seeds: string | null;
  _meta: string | null;
}

const defaultValue: MyForm = {
  fields: {
    name: '',
    type: '',
  },
  seeds: [],
  _meta: '',
};

const defaultErrors = {
  fields: {
    name: null,
    type: null,
  },
  seeds: null,
  _meta: null,
};

const validateFields = ({ fields, seeds, _meta }: MyForm): FormErrors => {
  // As you can see, we are validating ALL the fields on each keystroke. Very inefficient.
  const errors: FormErrors = {
    fields: {
      name: null,
      type: null,
    },
    seeds: null,
    _meta: null,
  };

  if (fields.name.trim() === '') {
    errors.fields.name = 'The field cannot be empty';
  }

  if (fields.type.trim() === '') {
    errors.fields.type = 'The field cannot be empty';
  }

  if (seeds.length === 0) {
    errors.seeds = 'The field cannot be empty';
  }

  try {
    JSON.parse(_meta);
  } catch (e) {
    errors._meta = 'The JSON is invalid';
  }

  return errors;
};

export const FormWithoutLib = () => {
  const [formState, setFormState] = useState<MyForm>(defaultValue);
  const [formErrors, setFormErrors] = useState<FormErrors>(defaultErrors);
  const [localSeedErrors, setLocalSeedErrors] = useState<string | null>(null);
  const [areErrorsVisible, setAreErrorsVisible] = useState(false);

  const onFieldChange = (fieldName: string, fieldValue: unknown) => {
    if (fieldName === 'fieldName') {
      setFormState(prev => {
        return {
          ...prev,
          fields: {
            ...prev.fields,
            name: fieldValue as string,
          },
        };
      });
    } else if (fieldName === 'fieldType') {
      setFormState(prev => {
        return {
          ...prev,
          fields: {
            ...prev.fields,
            type: fieldValue as string,
          },
        };
      });
    } else {
      setFormState(prev => {
        return {
          ...prev,
          [fieldName]: fieldValue,
        };
      });
    }
  };

  const isFormValid = (): boolean => {
    for (const key of Object.keys(formErrors)) {
      if (key === 'fields') {
        if (formErrors.fields.name !== null || formErrors.fields.type !== null) {
          return false;
        }
      } else {
        if ((formErrors as any)[key] !== null) {
          return false;
        }
      }
    }
    return true;
  };

  const getFormData = () => {
    // We now need to "serialize" our internal state (ComboBox, Json string)
    // to output the format we actually want.
    const output: any = {
      ...formState,
      fields: {
        ...formState.fields,
      },
    };

    output.seeds = output.seeds.map((seed: any) => seed.label);
    output._meta = JSON.parse(output._meta);

    return output;
  };

  const submitForm = () => {
    setAreErrorsVisible(true);

    if (!isFormValid()) {
      console.log('Form is invalid!'); // eslint-disable-line
      return;
    }
    const formData = getFormData();
    console.log(formData);  // eslint-disable-line
  };

  // ComboBox required handlers (just for 1 ComboBox....)
  // Taken from our ccr 'remote_cluster_form.js' (A form of 960 LOC... without the validators)
  const onCreateSeed = (newSeed: string) => {
    // If the user just hit enter without typing anything, treat it as a no-op.
    if (!newSeed) {
      return;
    }

    const errors = newSeed.startsWith('.') ? 'Cannot start with a period.' : null;

    if (errors) {
      setLocalSeedErrors(errors);
      // Return false to explicitly reject the user's input.
      return false;
    }

    const newSeeds = formState.seeds.slice(0);
    // We received a string, but the ComboBox works with objects, we need to convert
    newSeeds.push({ label: newSeed.toLowerCase() });
    onFieldChange('seeds', newSeeds);
  };

  const onSeedsInputChange = (seedInput: string) => {
    if (!seedInput) {
      // If empty seedInput ("") don't do anything. This happens
      // right after a seed is created.
      return;
    }

    setLocalSeedErrors((prev: any) => {
      // Allow typing to clear the errors, but not to add new ones.
      return seedInput.startsWith('.') ? prev : null;
    });
  };

  const onSeedsChange = (seeds: any) => {
    onFieldChange('seeds', seeds);
  };

  useEffect(() => {
    const errors = validateFields(formState);
    setFormErrors(errors);
  }, [formState]);

  const showSeedsErrors = Boolean(areErrorsVisible && formErrors.seeds) || localSeedErrors !== null;
  const seedsErrors = areErrorsVisible
    ? [localSeedErrors].concat(formErrors.seeds)
    : localSeedErrors;

  return (
    <EuiForm>
      <EuiFormRow
        label="Field name"
        helpText="Some help text"
        error={formErrors.fields.name}
        isInvalid={areErrorsVisible && formErrors.fields.name !== null}
        fullWidth
      >
        <EuiFieldText
          isInvalid={areErrorsVisible && formErrors.fields.name !== null}
          value={formState.fields.name}
          onChange={e => onFieldChange('fieldName', e.target.value)}
          fullWidth
        />
      </EuiFormRow>
      <EuiSpacer />
      <EuiFormRow
        label="Field type"
        helpText="Some help text"
        error={formErrors.fields.type}
        isInvalid={areErrorsVisible && formErrors.fields.type !== null}
        fullWidth
      >
        <EuiFieldText
          isInvalid={areErrorsVisible && formErrors.fields.type !== null}
          value={formState.fields.type}
          onChange={e => onFieldChange('fieldType', e.target.value)}
          fullWidth
        />
      </EuiFormRow>
      <EuiSpacer />
      <EuiFormRow
        label="Seeds"
        helpText="Add an item with a dot (.) to see validation"
        isInvalid={showSeedsErrors}
        error={seedsErrors}
        fullWidth
      >
        <EuiComboBox
          noSuggestions
          placeholder="host:port"
          selectedOptions={formState.seeds}
          onCreateOption={onCreateSeed}
          onChange={onSeedsChange}
          onSearchChange={onSeedsInputChange}
          isInvalid={showSeedsErrors}
          fullWidth
          data-test-subj="remoteClusterFormSeedsInput"
        />
      </EuiFormRow>
      <EuiSpacer />
      <EuiFormRow
        label="Meta"
        helpText="Some help texet"
        isInvalid={areErrorsVisible && formErrors._meta !== null}
        error={formErrors._meta}
        fullWidth
      >
        <EuiCodeEditor
          mode="json"
          theme="textmate"
          width="100%"
          height="250px"
          setOptions={{
            showLineNumbers: false,
            tabSize: 2,
          }}
          editorProps={{
            $blockScrolling: Infinity,
          }}
          showGutter={false}
          minLines={6}
          value={formState._meta}
          onChange={value => onFieldChange('_meta', value)}
        />
      </EuiFormRow>
      <EuiSpacer />
      <EuiButton
        fill
        color="secondary"
        iconType="check"
        onClick={submitForm}
        disabled={areErrorsVisible && !isFormValid()}
      >
        Save
      </EuiButton>
    </EuiForm>
  );
};
