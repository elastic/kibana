/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiButton,
  EuiToolTip
} from '@elastic/eui';

export function BucketSpanEstimator({ buttonDisabled, buttonText, estimatorRunning, guessBucketSpan }) {
  return (
    <div className="bucket-span-estimator">
      <EuiToolTip
        content="Experimental feature for estimating bucket span."
        position="bottom"
      >
        <EuiButton
          disabled={buttonDisabled}
          fill
          iconSide="right"
          isLoading={estimatorRunning}
          onClick={guessBucketSpan}
          size="s"
        >
          {buttonText}
        </EuiButton>
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

