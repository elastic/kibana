/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const strings = {
  getApplyButtonLabel: () =>
    i18n.translate('xpack.canvas.renderer.advancedFilter.applyButtonLabel', {
      defaultMessage: 'Apply',
      description: 'This refers to applying the filter to the Canvas workpad',
    }),
  getInputPlaceholder: () =>
    i18n.translate('xpack.canvas.renderer.advancedFilter.inputPlaceholder', {
      defaultMessage: 'Enter filter expression',
    }),
};

export interface Props {
  /** Optional value for the component */
  value?: string;
  /** Function to invoke when the filter value is changed */
  onChange: (value: string) => void;
  /** Function to invoke when the filter value is committed */
  commit: (value: string) => void;
}

export const AdvancedFilter: FunctionComponent<Props> = ({ value = '', onChange, commit }) => (
  <form
    onSubmit={(e) => {
      e.preventDefault();
      commit(value);
    }}
    className="canvasAdvancedFilter"
  >
    <EuiFlexGroup gutterSize="xs">
      <EuiFlexItem>
        <input
          type="text"
          className="canvasAdvancedFilter__input"
          placeholder={strings.getInputPlaceholder()}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <button className="canvasAdvancedFilter__button" type="submit">
          {strings.getApplyButtonLabel()}
        </button>
      </EuiFlexItem>
    </EuiFlexGroup>
  </form>
);

AdvancedFilter.defaultProps = {
  value: '',
};

AdvancedFilter.propTypes = {
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string,
  commit: PropTypes.func.isRequired,
};
