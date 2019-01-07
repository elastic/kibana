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
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

import { EuiIconTip } from '@elastic/eui';

import { ExplorerNoJobsFound } from './components/explorer_no_jobs_found';
import { ExplorerNoResultsFound } from './components/explorer_no_results_found';
import { InfluencersList } from '../components/influencers_list';
import { LoadingIndicator } from '../components/loading_indicator/loading_indicator';

export const Explorer = injectI18n(
  class Explorer extends React.Component {
    static propTypes = {
      hasResults: PropTypes.bool,
      influencers: PropTypes.object,
      jobs: PropTypes.array,
      loading: PropTypes.bool,
      noInfluencersConfigured: PropTypes.bool,
    };

    dummyMethod = () => {};

    render() {
      const { influencers, intl, hasResults, jobs, loading, noInfluencersConfigured } = this.props;

      if (loading === true) {
        return (
          <LoadingIndicator
            label={intl.formatMessage({
              id: 'xpack.ml.explorer.loadingLabel',
              defaultMessage: 'Loading',
            })}
          />
        );
      }

      if (jobs.length === 0) {
        return <ExplorerNoJobsFound />;
      }

      if (jobs.length > 0 && hasResults === false) {
        return <ExplorerNoResultsFound />;
      }

      return (
        <div className="results-container">
          {noInfluencersConfigured && (
            <div className="no-influencers-warning">
              <EuiIconTip
                content={intl.formatMessage({
                  id: 'xpack.ml.explorer.noConfiguredInfluencersTooltip',
                  defaultMessage:
                    'The Top Influencers list is hidden because no influencers have been configured for the selected jobs.',
                })}
                position="right"
                type="iInCircle"
              />
            </div>
          )}

          {noInfluencersConfigured === false && (
            <div className="column col-xs-2 euiText">
              <span className="panel-title">
                <FormattedMessage
                  id="xpack.ml.explorer.topInfuencersTitle"
                  defaultMessage="Top Influencers"
                />
                <InfluencersList influencers={influencers} />
              </span>
            </div>
          )}
        </div>
      );
    }
  }
);
