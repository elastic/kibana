/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, FocusEvent, FunctionComponent } from 'react';
import PropTypes from 'prop-types';
import { EuiIcon } from '@elastic/eui';
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
  value?: string;
  /** Function to invoke when the dropdown value is changed */
  onChange: (value: string) => void;
  /** Function to invoke when the dropdown value is committed */
  commit: (value: string) => void;
}

export const DropdownFilter: FunctionComponent<Props> = ({
  value,
  onChange,
  commit,
  choices = [],
}) => {
  let options = [
    { value: '%%CANVAS_MATCH_ALL%%', text: `-- ${strings.getMatchAllOptionLabel()} --` },
  ];
  options = options.concat(choices.map((choice) => ({ value: choice[0], text: choice[1] })));

  const changeHandler = (e: FocusEvent<HTMLSelectElement> | ChangeEvent<HTMLSelectElement>) => {
    if (e && e.target) {
      const target = e.target as HTMLSelectElement;
      onChange(target.value);
      commit(target.value);
    }
  };

  const dropdownOptions = options.map((option) => {
    const { text } = option;
    const optionValue = option.value;
    const selected = optionValue === value;

    return (
      <option key={optionValue} value={optionValue} aria-selected={selected}>
        {text}
      </option>
    );
  });

  /* eslint-disable jsx-a11y/no-onchange */
  return (
    <div className="canvasDropdownFilter">
      <select
        className="canvasDropdownFilter__select"
        value={value}
        onChange={changeHandler}
        data-test-subj="canvasDropdownFilter__select"
      >
        {dropdownOptions}
      </select>
      <EuiIcon className="canvasDropdownFilter__icon" type="arrowDown" />
    </div>
  );
};

DropdownFilter.propTypes = {
  choices: PropTypes.array,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  commit: PropTypes.func.isRequired,
};
