/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import PropTypes from 'prop-types';
import { FormatSelect } from '../../../../public/components/format_select/format_select';
import { ArgumentProps } from '../../../../types/arguments';

interface DateFormatOption {
  /** A MomentJS format string */
  value: string;
  /** The name to display for the format */
  text: string;
}

export interface Props extends ArgumentProps {
  /** An array of number formats options */
  dateFormats: DateFormatOption[];
  /** The handler to invoke when value changes */
  onValueChange: (value: string) => void;
  /** The value of the argument */
  argValue: string;
  /** The ID for the argument */
  argId: string;
}

export const DateFormatArgInput: FunctionComponent<Props> = ({
  dateFormats,
  onValueChange,
  argValue,
  argId,
}) => (
  <FormatSelect
    argId={argId}
    argValue={argValue}
    formatOptions={dateFormats}
    onValueChange={onValueChange}
    defaultCustomFormat="M/D/YY h:ma"
  />
);

DateFormatArgInput.propTypes = {
  dateFormats: PropTypes.arrayOf(
    PropTypes.shape({ value: PropTypes.string, text: PropTypes.string })
  ).isRequired,
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]).isRequired,
  argId: PropTypes.string.isRequired,
};
