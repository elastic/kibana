/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSelect } from '@elastic/eui';
import { isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';

export const NO_SELECTION = '__NO_SELECTION__';
const DEFAULT_PLACEHOLDER = i18n.translate('xpack.apm.selectPlaceholder', {
  defaultMessage: 'Select option:',
});

/**
 * This component addresses some cross-browser inconsistencies of `EuiSelect`
 * with `hasNoInitialSelection`. It uses the `placeholder` prop to populate
 * the first option as the initial, not selected option.
 */
// eslint-disable-next-line react/function-component-definition
export const SelectWithPlaceholder: typeof EuiSelect = (props) => {
  const placeholder = props.placeholder || DEFAULT_PLACEHOLDER;
  return (
    <EuiSelect
      {...props}
      options={[
        { text: placeholder, value: NO_SELECTION },
        ...(props.options || []),
      ]}
      value={isEmpty(props.value) ? NO_SELECTION : props.value}
      onChange={(e) => {
        if (props.onChange) {
          const customEvent = Object.assign(e, {
            target: Object.assign(e.target, {
              value: e.target.value === NO_SELECTION ? '' : e.target.value,
            }),
          });
          props.onChange(customEvent);
        }
      }}
    />
  );
};
