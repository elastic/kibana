/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { FieldSelect, fieldShape } from '../field_select';
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
        color={styleOptions.color}
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

DynamicColorSelection.propTypes = {
  ordinalFields: PropTypes.arrayOf(fieldShape).isRequired,
  styleOptions: PropTypes.shape({
    color: PropTypes.string.isRequired,
    field: fieldShape,
  }).isRequired,
  onChange: PropTypes.func.isRequired
};
