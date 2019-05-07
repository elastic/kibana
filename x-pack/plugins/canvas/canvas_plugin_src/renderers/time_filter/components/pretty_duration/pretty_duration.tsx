/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import PropTypes from 'prop-types';
import React, { SFC } from 'react';
import { formatDuration } from './lib/format_duration';

export interface Props {
  /** Start date string */
  from: string;
  /** End date string */
  to: string;
}
export const PrettyDuration: SFC<Props> = ({ from, to }) => <span>{formatDuration(from, to)}</span>;

PrettyDuration.propTypes = {
  from: PropTypes.instanceOf(moment).isRequired,
  to: PropTypes.instanceOf(moment).isRequired,
};
