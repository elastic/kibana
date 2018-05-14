/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiToolTip
} from '@elastic/eui';

export function BucketSpanEstimator({ buttonDisabled, buttonText, estimatorRunning, guessBucketSpan }) {
  return (
    <div className="bucket-span-estimator">
      <EuiToolTip content="Experimental feature for estimating bucket span." position="bottom">
        <button
          onClick={guessBucketSpan}
          disabled={buttonDisabled}
          type="button"
          className="kuiButton kuiButton--basic kuiButton--small"
        >
          {buttonText}
          {estimatorRunning ? <i className="fa fa-spinner fa-spin" /> : ''}
        </button>
      </EuiToolTip>
    </div>
  );
}
BucketSpanEstimator.propTypes = {
  buttonDisabled: PropTypes.bool.isRequired,
  buttonText: PropTypes.string.isRequired,
  estimatorRunning: PropTypes.bool.isRequired,
  guessBucketSpan: PropTypes.func.isRequired
};

