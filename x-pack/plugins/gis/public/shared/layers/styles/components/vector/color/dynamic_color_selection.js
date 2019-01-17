/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Fragment } from 'react';
import { FieldSelect } from '../field_select';
import { ColorRampSelect } from './color_ramp_select';
import { EuiSpacer } from '@elastic/eui';

export function DynamicColorSelection({ ordinalFields, onChange, styleOptions }) {
  const onFieldChange = ({ field }) => {
    onChange({ ...styleOptions, field });
  };

  const onColorChange = ({ color }) => {
    onChange({ ...styleOptions, color });
  };

  return (
    <Fragment>
      <ColorRampSelect
        onChange={onColorChange}
        color={_.get(styleOptions, 'color')}
      />
      <EuiSpacer size="s" />
      <FieldSelect
        fields={ordinalFields}
        selectedField={_.get(styleOptions, 'field')}
        onChange={onFieldChange}
      />
    </Fragment>
  );
}
