/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find } from 'lodash/fp';
import { EuiCodeBlock, EuiFormRow, EuiComboBox, EuiTextColor } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import { useSavedScripts } from '../use_saved_scripts';
// import type { savedScriptSO } from '../routes/saved_queries/list';

const euiCodeBlockCss = {
  '.euiCodeBlock__line': {
    whiteSpace: 'nowrap' as const,
  },
};

export interface SavedScriptsDropdownProps {
  disabled?: boolean;
  onChange: (value: any) => void;
}

interface SelectedOption {
  label: string;
  value: any & {
    savedScriptId: string;
  };
}

const SavedScriptsDropdownComponent: React.FC<SavedScriptsDropdownProps> = ({
  disabled,
  onChange,
}) => {
  // const savedScriptId = useWatch({ name: 'savedScriptId' });
  // const context = useFormContext();
  // const { errors } = context.formState;
  // const queryFieldError = errors?.query?.message;
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);

  const { data } = useSavedScripts({});

  console.log({ data });
  const queryOptions = useMemo(
    () =>
      data?.data
        // filter will not be required - I just created missing objects while testing
        ?.filter((savedScript) => savedScript.command)
        .map((savedScript) => ({
          // TOSTRING is not required, I just created a wrong id while testing
          label: savedScript.id.toString() ?? '',
          value: {
            savedScriptId: savedScript.id.toString(),
            id: savedScript.id.toString(),
            description: savedScript.description,
            command: savedScript.command,
          },
        })) ?? [],
    [data]
  );

  const handlesavedScriptChange = useCallback(
    (newSelectedOptions) => {
      if (!newSelectedOptions.length) {
        onChange(null);
        setSelectedOptions(newSelectedOptions);

        return;
      }

      const selectedsavedScript = find(['id', newSelectedOptions[0].value.id], data?.data);

      if (selectedsavedScript) {
        onChange({ ...selectedsavedScript, savedScriptId: selectedsavedScript.id });
      }

      setSelectedOptions(newSelectedOptions);
    },
    [data, onChange]
  );

  const renderOption = useCallback(
    ({ value }) => (
      <>
        <strong>{value.id}</strong>
        <div className="eui-textTruncate">
          <EuiTextColor color="subdued">{value.description}</EuiTextColor>
        </div>
        <EuiCodeBlock css={euiCodeBlockCss} language="shell" fontSize="m" paddingSize="s">
          {(value.command || 'test').split('\n').join(' ')}
        </EuiCodeBlock>
      </>
    ),
    []
  );

  return (
    <EuiFormRow
      // isInvalid={!!queryFieldError}
      // error={queryFieldError}
      label={'Script'}
      fullWidth
    >
      <EuiComboBox
        data-test-subj={'savedScriptSelect'}
        isDisabled={disabled}
        fullWidth
        placeholder={'Search for already existing scripts'}
        singleSelection={{ asPlainText: true }}
        options={queryOptions}
        selectedOptions={selectedOptions}
        onChange={handlesavedScriptChange}
        renderOption={renderOption}
        rowHeight={110}
      />
    </EuiFormRow>
  );
};

SavedScriptsDropdownComponent.displayName = 'SavedScriptsDropdown';

export const SavedScriptsDropdown = React.memo(SavedScriptsDropdownComponent);
