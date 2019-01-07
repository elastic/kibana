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

import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiIconTip, EuiSelect } from '@elastic/eui';

import { ExplorerNoJobsFound } from './components/explorer_no_jobs_found';
import { ExplorerNoResultsFound } from './components/explorer_no_results_found';
import { ExplorerSwimlane } from './explorer_swimlane';
import { InfluencersList } from '../components/influencers_list';
import { LoadingIndicator } from '../components/loading_indicator/loading_indicator';
import { SelectLimit } from './select_limit/select_limit';

function mapSwimlaneOptionsToEuiOptions(options) {
  return options.map(option => ({
    value: option,
    text: option,
  }));
}

export const Explorer = injectI18n(
  class Explorer extends React.Component {
    static propTypes = {
      hasResults: PropTypes.bool,
      influencers: PropTypes.object,
      jobs: PropTypes.array,
      loading: PropTypes.bool,
      noInfluencersConfigured: PropTypes.bool,
      setSwimlaneSelectActive: PropTypes.func,
      setSwimlaneViewBy: PropTypes.func,
      swimlaneOverall: PropTypes.object,
      swimlaneViewByFieldName: PropTypes.string,
      viewByLoadedForTimeFormatted: PropTypes.any,
      viewBySwimlaneOptions: PropTypes.array,
    };

    viewByChangeHandler = e => this.props.setSwimlaneViewBy(e.target.value);

    render() {
      const {
        influencers,
        intl,
        hasResults,
        jobs,
        loading,
        mlSelectLimitService,
        noInfluencersConfigured,
        setSwimlaneSelectActive,
        swimlaneOverall,
        swimlaneViewByFieldName,
        viewByLoadedForTimeFormatted,
        viewBySwimlaneOptions,
      } = this.props;

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

      const mainColumnWidthClassName = noInfluencersConfigured === true ? 'col-xs-12' : 'col-xs-10';
      const mainColumnClasses = `column ${mainColumnWidthClassName}`;

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

          <div className={mainColumnClasses}>
            <span className="panel-title euiText">
              <FormattedMessage
                id="xpack.ml.explorer.anomalyTimelineTitle"
                defaultMessage="Anomaly timeline"
              />
            </span>

            <div
              className="ml-explorer-swimlane euiText"
              onMouseEnter={() => setSwimlaneSelectActive(true)}
              onMouseLeave={() => setSwimlaneSelectActive(false)}
            >
              <ExplorerSwimlane {...swimlaneOverall} />
            </div>

            {viewBySwimlaneOptions.length > 0 && (
              <EuiFlexGroup direction="row" gutterSize="l" responsive={true}>
                <EuiFlexItem grow={false} style={{ width: '170px' }}>
                  <EuiFormRow
                    label={intl.formatMessage({
                      id: 'xpack.ml.explorer.viewByLabel',
                      defaultMessage: 'View by:',
                    })}
                  >
                    <EuiSelect
                      id="selectViewBy"
                      options={mapSwimlaneOptionsToEuiOptions(viewBySwimlaneOptions)}
                      value={swimlaneViewByFieldName}
                      onChange={this.viewByChangeHandler}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem grow={false} style={{ width: '170px' }}>
                  <EuiFormRow
                    label={intl.formatMessage({
                      id: 'xpack.ml.explorer.limitLabel',
                      defaultMessage: 'Limit:',
                    })}
                  >
                    <SelectLimit mlSelectLimitService={mlSelectLimitService} />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem grow={false} style={{ 'align-self': 'center' }}>
                  <EuiFormRow label="&#8203;">
                    <div className="panel-sub-title">
                      {viewByLoadedForTimeFormatted &&
                        <FormattedMessage
                          id="xpack.ml.explorer.sortedByMaxAnomalyScoreForTimeFormattedLabel"
                          defaultMessage="(Sorted by max anomaly score for {viewByLoadedForTimeFormatted})"
                          values={{ viewByLoadedForTimeFormatted }}
                        />
                      }
                      {viewByLoadedForTimeFormatted === undefined &&
                        <FormattedMessage
                          id="xpack.ml.explorer.sortedByMaxAnomalyScoreLabel"
                          defaultMessage="(Sorted by max anomaly score)"
                        />
                      }
                    </div>
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </div>
        </div>
      );
    }
  }
);
