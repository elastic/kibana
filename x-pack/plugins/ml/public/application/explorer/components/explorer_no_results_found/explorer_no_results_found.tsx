/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiEmptyPrompt } from '@elastic/eui';

export interface ExplorerNoResultsFoundProps {
  hasResults: boolean;
  selectedJobsRunning: boolean;
}

/*
 * React component for rendering EuiEmptyPrompt when no results were found.
 */
export const ExplorerNoResultsFound: FC<ExplorerNoResultsFoundProps> = ({
  hasResults,
  selectedJobsRunning,
}) => {
  const resultsHaveNoAnomalies = hasResults === true;
  const noResults = hasResults === false;
  return (
    <EuiEmptyPrompt
      iconType="iInCircle"
      title={
        <h2>
          {resultsHaveNoAnomalies && (
            <FormattedMessage
              id="xpack.ml.explorer.noAnomaliesFoundLabel"
              defaultMessage="No anomalies found"
            />
          )}
          {noResults && (
            <FormattedMessage
              id="xpack.ml.explorer.noResultsFoundLabel"
              defaultMessage="No results found"
            />
          )}
        </h2>
      }
      body={
        <React.Fragment>
          {selectedJobsRunning && noResults && (
            <p>
              <FormattedMessage
                id="xpack.ml.explorer.selectedJobsRunningLabel"
                defaultMessage="One or more selected jobs are still running and results may not be available yet."
              />
            </p>
          )}
          {!selectedJobsRunning && (
            <p>
              <FormattedMessage
                id="xpack.ml.explorer.tryWideningTimeSelectionLabel"
                defaultMessage="Try widening the time selection or moving further back in time"
              />
            </p>
          )}
        </React.Fragment>
      }
    />
  );
};
