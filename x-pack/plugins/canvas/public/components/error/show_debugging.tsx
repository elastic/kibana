/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';
import PropTypes from 'prop-types';
import { EuiButtonEmpty } from '@elastic/eui';
import { Debug } from '../debug';
import { Props } from './error';

export const ShowDebugging: FC<Props> = ({ payload }) => {
  const [expanded, setExpanded] = useState(false);

  return process.env.NODE_ENV === 'production' ? null : (
    <div>
      <EuiButtonEmpty
        iconType={expanded ? 'arrowDown' : 'arrowRight'}
        onClick={() => setExpanded(!expanded)}
      >
        See Details
      </EuiButtonEmpty>
      {expanded && (
        <div style={{ height: 260 }}>
          <Debug payload={payload} />
        </div>
      )}
    </div>
  );
};

ShowDebugging.propTypes = {
  payload: PropTypes.object.isRequired,
};
