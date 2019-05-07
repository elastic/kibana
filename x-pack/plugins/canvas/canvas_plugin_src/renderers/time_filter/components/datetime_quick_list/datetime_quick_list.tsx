/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import PropTypes from 'prop-types';
import React, { ReactNode, SFC } from 'react';
import 'react-datetime/css/react-datetime.css';
import { quickRanges } from './quick_ranges';

export interface Props {
  /** Optional initial start date string */
  from?: string;
  /** Optional initial end date string */
  to?: string;
  /** Function invoked when a date range is clicked */
  onSelect: (from: string, to: string) => void;
  /** Nodes to display under the date range buttons */
  children?: ReactNode;
}

export const DatetimeQuickList: SFC<Props> = ({ from, to, onSelect, children }) => (
  <div style={{ display: 'grid', alignItems: 'center' }}>
    {quickRanges.map((range, i) =>
      from === range.from && to === range.to ? (
        <EuiButton size="s" fill key={i} onClick={() => onSelect(range.from, range.to)}>
          {range.display}
        </EuiButton>
      ) : (
        <EuiButtonEmpty size="s" key={i} onClick={() => onSelect(range.from, range.to)}>
          {range.display}
        </EuiButtonEmpty>
      )
    )}
    {children}
  </div>
);

DatetimeQuickList.propTypes = {
  from: PropTypes.string,
  to: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  children: PropTypes.node,
};
