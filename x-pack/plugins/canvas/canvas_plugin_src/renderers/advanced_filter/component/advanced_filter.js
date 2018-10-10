/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import './advanced_filter.scss';

const AdvancedFilterUI = ({ value, onChange, commit, intl }) => (
  <form
    onSubmit={e => {
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
          placeholder={intl.formatMessage({
            id: 'xpack.canvas.renderers.advancedFilter.filterExpressionInputPlaceholder',
            defaultMessage: 'Enter filter expression',
          })}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <button
          className="canvasAdvancedFilter__button"
          type="submit"
          onClick={() => commit(value)}
        >
          <FormattedMessage
            id="xpack.canvas.renderers.advancedFilter.applyButtonLabel"
            defaultMessage="Apply"
          />
        </button>
      </EuiFlexItem>
    </EuiFlexGroup>
  </form>
);

AdvancedFilterUI.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.string,
  commit: PropTypes.func,
};

export const AdvancedFilter = injectI18n(AdvancedFilterUI);
