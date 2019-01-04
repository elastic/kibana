/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * React component for rendering Explorer dashboard swimlanes.
 */

import PropTypes from 'prop-types';
import React from 'react';
import { injectI18n } from '@kbn/i18n/react';

import { ExplorerNoJobsFound } from './components/explorer_no_jobs_found';
import { ExplorerNoResultsFound } from './components/explorer_no_results_found';
import { LoadingIndicator } from '../components/loading_indicator/loading_indicator';

export const Explorer = injectI18n(
  class Explorer extends React.Component {
    static propTypes = {
      hasResults: PropTypes.bool,
      jobs: PropTypes.array,
      loading: PropTypes.bool,
    };

    dummyMethod = () => {};

    render() {
      const { intl, hasResults, jobs, loading } = this.props;
      return (
        <div>
          {loading && (
            <LoadingIndicator
              label={intl.formatMessage({
                id: 'xpack.ml.explorer.loadingLabel',
                defaultMessage: 'Loading',
              })}
            />
          )}
          {jobs.length === 0 && loading === false && <ExplorerNoJobsFound />}
          {jobs.length > 0 && loading === false && hasResults === false && <ExplorerNoResultsFound />}
        </div>
      );
    }
  }
);
