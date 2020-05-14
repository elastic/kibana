/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { withState } from 'recompose';
import { EuiButtonEmpty } from '@elastic/eui';
import { Debug } from '../debug';

const ShowDebuggingComponent = ({ payload, expanded, setExpanded }) =>
  process.env.NODE_ENV === 'production' ? null : (
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

ShowDebuggingComponent.propTypes = {
  expanded: PropTypes.bool.isRequired,
  setExpanded: PropTypes.func.isRequired,
  payload: PropTypes.object.isRequired,
};

export const ShowDebugging = withState('expanded', 'setExpanded', false)(ShowDebuggingComponent);
