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

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';

import { AnnotationsTable } from '../components/annotations_table';
import { CheckboxShowCharts } from '../components/controls/checkbox_showcharts/checkbox_showcharts';
import {
  ExplorerNoInfluencersFound,
  ExplorerNoJobsFound,
  ExplorerNoResultsFound,
} from './components';
import { ExplorerSwimlane } from './explorer_swimlane';
import { InfluencersList } from '../components/influencers_list';
import { LoadingIndicator } from '../components/loading_indicator/loading_indicator';
import { SelectInterval } from '../components/controls/select_interval/select_interval';
import { SelectLimit } from './select_limit/select_limit';
import { SelectSeverity } from '../components/controls/select_severity/select_severity';

// Explorer Charts
import { ExplorerChartsContainer } from './explorer_charts/explorer_charts_container';

// Anomalies Table
import { AnomaliesTable } from '../components/anomalies_table/anomalies_table';
import { timefilter } from 'ui/timefilter';

function mapSwimlaneOptionsToEuiOptions(options) {
  return options.map(option => ({
    value: option,
    text: option,
  }));
}

export const Explorer = injectI18n(
  class Explorer extends React.Component {
    static propTypes = {
      annotationsData: PropTypes.array,
      anomalyChartRecords: PropTypes.array,
      hasResults: PropTypes.bool,
      influencers: PropTypes.object,
      jobs: PropTypes.array,
      loading: PropTypes.bool,
      noInfluencersConfigured: PropTypes.bool,
      setSwimlaneSelectActive: PropTypes.func,
      setSwimlaneViewBy: PropTypes.func,
      showViewBySwimlane: PropTypes.bool,
      swimlaneOverall: PropTypes.object,
      swimlaneViewByFieldName: PropTypes.string,
      tableData: PropTypes.object,
      viewByLoadedForTimeFormatted: PropTypes.any,
      viewBySwimlaneOptions: PropTypes.array,
    };

    viewByChangeHandler = e => this.props.setSwimlaneViewBy(e.target.value);

    onSwimlaneEnterHandler = () => this.props.setSwimlaneSelectActive(true);
    onSwimlaneLeaveHandler = () => this.props.setSwimlaneSelectActive(false);

    render() {
      const {
        annotationsData,
        anomalyChartRecords,
        chartsData,
        influencers,
        intl,
        hasResults,
        jobs,
        loading,
        noInfluencersConfigured,
        showViewBySwimlane,
        swimlaneOverall,
        swimlaneViewBy,
        swimlaneViewByFieldName,
        tableData,
        viewByLoadedForTimeFormatted,
        viewBySwimlaneDataLoading,
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
              </span>
              <InfluencersList influencers={influencers} />
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
              onMouseEnter={this.onSwimlaneEnterHandler}
              onMouseLeave={this.onSwimlaneLeaveHandler}
            >
              <ExplorerSwimlane {...swimlaneOverall} />
            </div>

            {viewBySwimlaneOptions.length > 0 && (
              <React.Fragment>
                <EuiFlexGroup direction="row" gutterSize="l" responsive={true}>
                  <EuiFlexItem grow={false}>
                    <EuiFormRow
                      label={intl.formatMessage({
                        id: 'xpack.ml.explorer.viewByLabel',
                        defaultMessage: 'View by',
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
                  <EuiFlexItem grow={false}>
                    <EuiFormRow
                      label={intl.formatMessage({
                        id: 'xpack.ml.explorer.limitLabel',
                        defaultMessage: 'Limit',
                      })}
                    >
                      <SelectLimit />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false} style={{ alignSelf: 'center' }}>
                    <EuiFormRow label="&#8203;">
                      <div className="panel-sub-title">
                        {viewByLoadedForTimeFormatted && (
                          <FormattedMessage
                            id="xpack.ml.explorer.sortedByMaxAnomalyScoreForTimeFormattedLabel"
                            defaultMessage="(Sorted by max anomaly score for {viewByLoadedForTimeFormatted})"
                            values={{ viewByLoadedForTimeFormatted }}
                          />
                        )}
                        {viewByLoadedForTimeFormatted === undefined && (
                          <FormattedMessage
                            id="xpack.ml.explorer.sortedByMaxAnomalyScoreLabel"
                            defaultMessage="(Sorted by max anomaly score)"
                          />
                        )}
                      </div>
                    </EuiFormRow>
                  </EuiFlexItem>
                </EuiFlexGroup>

                {showViewBySwimlane && (
                  <div
                    className="ml-explorer-swimlane euiText"
                    onMouseEnter={this.onSwimlaneEnterHandler}
                    onMouseLeave={this.onSwimlaneLeaveHandler}
                  >
                    <ExplorerSwimlane {...swimlaneViewBy} />
                  </div>
                )}

                {viewBySwimlaneDataLoading && (
                  <LoadingIndicator/>
                )}

                {!showViewBySwimlane && !viewBySwimlaneDataLoading && (
                  <ExplorerNoInfluencersFound swimlaneViewByFieldName={swimlaneViewByFieldName} />
                )}
              </React.Fragment>
            )}

            {annotationsData.length > 0 && (
              <React.Fragment>
                <span className="panel-title euiText">
                  <FormattedMessage
                    id="xpack.ml.explorer.annotationsTitle"
                    defaultMessage="Annotations"
                  />
                </span>
                <AnnotationsTable
                  annotations={annotationsData}
                  drillDown={true}
                  numberBadge={false}
                />
                <br />
                <br />
              </React.Fragment>
            )}

            <span className="panel-title euiText">
              <FormattedMessage id="xpack.ml.explorer.anomaliesTitle" defaultMessage="Anomalies" />
            </span>

            <EuiFlexGroup
              direction="row"
              gutterSize="l"
              responsive={true}
              className="ml-anomalies-controls"
            >
              <EuiFlexItem grow={false} style={{ width: '170px' }}>
                <EuiFormRow
                  label={intl.formatMessage({
                    id: 'xpack.ml.explorer.severityThresholdLabel',
                    defaultMessage: 'Severity threshold',
                  })}
                >
                  <SelectSeverity />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ width: '170px' }}>
                <EuiFormRow
                  label={intl.formatMessage({
                    id: 'xpack.ml.explorer.intervalLabel',
                    defaultMessage: 'Interval',
                  })}
                >
                  <SelectInterval />
                </EuiFormRow>
              </EuiFlexItem>
              {anomalyChartRecords.length > 0 && (
                <EuiFlexItem grow={false} style={{ alignSelf: 'center' }}>
                  <EuiFormRow label="&#8203;">
                    <CheckboxShowCharts />
                  </EuiFormRow>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>

            <EuiSpacer size="m" />

            <div className="euiText explorer-charts">
              <ExplorerChartsContainer {...chartsData} />
            </div>

            <AnomaliesTable tableData={tableData} timefilter={timefilter} />
          </div>
        </div>
      );
    }
  }
);
