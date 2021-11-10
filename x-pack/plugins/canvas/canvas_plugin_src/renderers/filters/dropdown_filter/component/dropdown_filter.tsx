/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, FocusEvent, FunctionComponent, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { EuiSelect, EuiSelectOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const strings = {
  getMatchAllOptionLabel: () =>
    i18n.translate('xpack.canvas.renderer.dropdownFilter.matchAllOptionLabel', {
      defaultMessage: 'ANY',
      description: 'The dropdown filter option to match any value in the field.',
    }),
};

export interface Props {
  /**
   * A collection of choices to display in the dropdown
   * @default []
   */
  choices?: Array<[string, string]>;
  /**
   * Optional value for the component. If the value is not present in the
   * choices collection, it will be discarded.
   */
  initialValue?: string;
  /** Function to invoke when the dropdown value is committed */
  commit: (value: string) => void;
}

export const DropdownFilter: FunctionComponent<Props> = ({
  initialValue = '',
  commit,
  choices = [],
}) => {
  const [value, setValue] = useState<string>(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  let options = [
    { value: '%%CANVAS_MATCH_ALL%%', text: `-- ${strings.getMatchAllOptionLabel()} --` },
  ];
  options = options.concat(choices.map((choice) => ({ value: choice[0], text: choice[1] })));

  const changeHandler = (e: FocusEvent<HTMLSelectElement> | ChangeEvent<HTMLSelectElement>) => {
    if (e && e.target) {
      const target = e.target as HTMLSelectElement;
      setValue(target.value);
      commit(target.value);
    }
  };

  const dropdownOptions: EuiSelectOption[] = options.map((option) => {
    const { text } = option;
    const optionValue = option.value;
    const selected = optionValue === value;

    return {
      text,
      selected,
      value: optionValue,
    };
  });

  return (
    <div className="canvasDropdownFilter">
      <EuiSelect
        className="canvasDropdownFilter__select"
        value={value}
        onChange={changeHandler}
        data-test-subj="canvasDropdownFilter__select"
        options={dropdownOptions}
        fullWidth
        compressed
      />
    </div>
  );
};

DropdownFilter.propTypes = {
  choices: PropTypes.array,
  initialValue: PropTypes.string,
  commit: PropTypes.func.isRequired,
};
