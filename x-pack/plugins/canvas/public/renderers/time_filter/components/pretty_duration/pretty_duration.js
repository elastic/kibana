/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { PropTypes } from 'prop-types';
import { formatDuration } from './lib/format_duration';

export const PrettyDuration = ({ from, to }) => <span>{formatDuration(from, to)}</span>;

PrettyDuration.propTypes = {
  from: PropTypes.any.isRequired,
  to: PropTypes.any.isRequired,
};
