/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import {
  EuiColorPicker,
  EuiFormControlLayout
} from '@elastic/eui';

export function StaticColorSelection({ onChange, styleOptions }) {
  const onColorChange = color => {
    onChange({ color });
  };

  return (
    <EuiFormControlLayout>
      <EuiColorPicker
        onChange={onColorChange}
        color={_.get(styleOptions, 'color')}
        className="gisColorPicker euiFieldText"
      />
    </EuiFormControlLayout>
  );
}
