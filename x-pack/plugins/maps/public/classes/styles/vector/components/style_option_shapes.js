/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import { fieldShape } from './field_select';

export const staticColorShape = PropTypes.shape({
  color: PropTypes.string.isRequired,
});

export const dynamicColorShape = PropTypes.shape({
  color: PropTypes.string,
  field: fieldShape,
  customColorRamp: PropTypes.array,
  useCustomColorRamp: PropTypes.bool,
});

export const staticOrientationShape = PropTypes.shape({
  orientation: PropTypes.number.isRequired,
});

export const dynamicOrientationShape = PropTypes.shape({
  field: fieldShape,
});

export const staticSizeShape = PropTypes.shape({
  size: PropTypes.number.isRequired,
});

export const dynamicSizeShape = PropTypes.shape({
  minSize: PropTypes.number.isRequired,
  maxSize: PropTypes.number.isRequired,
  field: fieldShape,
});
