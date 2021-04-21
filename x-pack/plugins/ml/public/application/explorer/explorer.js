/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * React component for rendering Explorer dashboard swimlanes.
 */

import PropTypes from 'prop-types';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  htmlIdGenerator,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIconTip,
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiSpacer,
  EuiTitle,
  EuiLoadingContent,
  EuiPanel,
  EuiAccordion,
  EuiBadge,
} from '@elastic/eui';

import { AnnotationFlyout } from '../components/annotations/annotation_flyout';
import { AnnotationsTable } from '../components/annotations/annotations_table';
import { ExplorerNoJobsFound, ExplorerNoResultsFound } from './components';
import { DatePickerWrapper } from '../components/navigation_menu/date_picker_wrapper';
import { InfluencersList } from '../components/influencers_list';
import { explorerService } from './explorer_dashboard_service';
import { AnomalyResultsViewSelector } from '../components/anomaly_results_view_selector';
import { NavigationMenu } from '../components/navigation_menu';
import { CheckboxShowCharts } from '../components/controls/checkbox_showcharts';
import { JobSelector } from '../components/job_selector';
import { SelectInterval } from '../components/controls/select_interval/select_interval';
import { SelectSeverity } from '../components/controls/select_severity/select_severity';
import {
  ExplorerQueryBar,
  getKqlQueryValues,
  DEFAULT_QUERY_LANG,
} from './components/explorer_query_bar/explorer_query_bar';
import {
  getDateFormatTz,
  removeFilterFromQueryString,
  getQueryPattern,
  escapeParens,
  escapeDoubleQuotes,
} from './explorer_utils';
import { AnomalyTimeline } from './anomaly_timeline';

import { FILTER_ACTION } from './explorer_constants';

// Explorer Charts
import { ExplorerChartsContainer } from './explorer_charts/explorer_charts_container';

// Anomalies Table
import { AnomaliesTable } from '../components/anomalies_table/anomalies_table';

import { getToastNotifications } from '../util/dependency_cache';
import { ANOMALY_DETECTION_DEFAULT_TIME_RANGE } from '../../../common/constants/settings';
import { withKibana } from '../../../../../../src/plugins/kibana_react/public';
import { ML_APP_URL_GENERATOR } from '../../../common/constants/ml_url_generator';
import { AnomalyContextMenu } from './anomaly_context_menu';

const ExplorerPage = ({
  children,
  jobSelectorProps,
  noInfluencersConfigured,
  influencers,
  filterActive,
  filterPlaceHolder,
  indexPattern,
  queryString,
  filterIconTriggeredQuery,
  updateLanguage,
}) => (
  <div data-test-subj="mlPageAnomalyExplorer">
    <NavigationMenu tabId="anomaly_detection" />
    <EuiPage style={{ background: 'none' }}>
      <EuiPageBody>
        <EuiPageHeader>
          <EuiPageHeaderSection>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <AnomalyResultsViewSelector viewId="explorer" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle className="eui-textNoWrap">
                  <h1>
                    <FormattedMessage
                      id="xpack.ml.explorer.pageTitle"
                      defaultMessage="Anomaly Explorer"
                    />
                  </h1>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPageHeaderSection>
          <EuiPageHeaderSection style={{ width: '100%' }}>
            <EuiFlexGroup alignItems="center" justifyContent="flexEnd" gutterSize="s">
              {noInfluencersConfigured === false && influencers !== undefined && (
                <EuiFlexItem>
                  <div className="mlAnomalyExplorer__filterBar">
                    <ExplorerQueryBar
                      filterActive={filterActive}
                      filterPlaceHolder={filterPlaceHolder}
                      indexPattern={indexPattern}
                      queryString={queryString}
                      filterIconTriggeredQuery={filterIconTriggeredQuery}
                      updateLanguage={updateLanguage}
                    />
                  </div>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <DatePickerWrapper />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPageHeaderSection>
        </EuiPageHeader>
        <EuiHorizontalRule margin="none" />
        <JobSelector {...jobSelectorProps} />
        <EuiHorizontalRule margin="none" />
        {children}
      </EuiPageBody>
    </EuiPage>
  </div>
);

export class ExplorerUI extends React.Component {
  static propTypes = {
    explorerState: PropTypes.object.isRequired,
    setSelectedCells: PropTypes.func.isRequired,
    severity: PropTypes.number.isRequired,
    showCharts: PropTypes.bool.isRequired,
    selectedJobsRunning: PropTypes.bool.isRequired,
  };

  state = { filterIconTriggeredQuery: undefined, language: DEFAULT_QUERY_LANG };
  htmlIdGen = htmlIdGenerator();

  componentDidMount() {
    const { invalidTimeRangeError } = this.props;
    if (invalidTimeRangeError) {
      const toastNotifications = getToastNotifications();
      toastNotifications.addWarning(
        i18n.translate('xpack.ml.explorer.invalidTimeRangeInUrlCallout', {
          defaultMessage:
            'The time filter was changed to the full range due to an invalid default time filter. Check the advanced settings for {field}.',
          values: {
            field: ANOMALY_DETECTION_DEFAULT_TIME_RANGE,
          },
        })
      );
    }
  }

  // Escape regular parens from fieldName as that portion of the query is not wrapped in double quotes
  // and will cause a syntax error when called with getKqlQueryValues
  applyFilter = (fieldName, fieldValue, action) => {
    const { filterActive, indexPattern, queryString } = this.props.explorerState;
    let newQueryString = '';
    const operator = 'and ';
    const sanitizedFieldName = escapeParens(fieldName);
    const sanitizedFieldValue = escapeDoubleQuotes(fieldValue);

    if (action === FILTER_ACTION.ADD) {
      // Don't re-add if already exists in the query
      const queryPattern = getQueryPattern(fieldName, fieldValue);
      if (queryString.match(queryPattern) !== null) {
        return;
      }
      newQueryString = `${
        queryString ? `${queryString} ${operator}` : ''
      }${sanitizedFieldName}:"${sanitizedFieldValue}"`;
    } else if (action === FILTER_ACTION.REMOVE) {
      if (filterActive === false) {
        return;
      } else {
        newQueryString = removeFilterFromQueryString(
          queryString,
          sanitizedFieldName,
          sanitizedFieldValue
        );
      }
    }

    this.setState({ filterIconTriggeredQuery: `${newQueryString}` });

    try {
      const { clearSettings, settings } = getKqlQueryValues({
        inputString: `${newQueryString}`,
        queryLanguage: this.state.language,
        indexPattern,
      });

      if (clearSettings === true) {
        explorerService.clearInfluencerFilterSettings();
      } else {
        explorerService.setInfluencerFilterSettings(settings);
      }
    } catch (e) {
      console.log('Invalid query syntax from table', e); // eslint-disable-line no-console

      const toastNotifications = getToastNotifications();
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.explorer.invalidKuerySyntaxErrorMessageFromTable', {
          defaultMessage:
            'Invalid syntax in query bar. The input must be valid Kibana Query Language (KQL)',
        })
      );
    }
  };

  updateLanguage = (language) => this.setState({ language });

  render() {
    const {
      share: {
        urlGenerators: { getUrlGenerator },
      },
    } = this.props.kibana.services;

    const mlUrlGenerator = getUrlGenerator(ML_APP_URL_GENERATOR);

    const {
      showCharts,
      severity,
      stoppedPartitions,
      selectedJobsRunning,
      timefilter,
      timeBuckets,
    } = this.props;

    const {
      annotations,
      chartsData,
      filterActive,
      filterPlaceHolder,
      indexPattern,
      influencers,
      loading,
      noInfluencersConfigured,
      overallSwimlaneData,
      queryString,
      selectedCells,
      selectedJobs,
      tableData,
    } = this.props.explorerState;
    const { annotationsData, aggregations, error: annotationsError } = annotations;

    const jobSelectorProps = {
      dateFormatTz: getDateFormatTz(),
    };

    const noJobsFound = selectedJobs === null || selectedJobs.length === 0;
    const hasResults = overallSwimlaneData.points && overallSwimlaneData.points.length > 0;
    const hasResultsWithAnomalies =
      (hasResults && overallSwimlaneData.points.some((v) => v.value > 0)) ||
      tableData.anomalies?.length > 0;

    if (noJobsFound && !loading) {
      return (
        <ExplorerPage jobSelectorProps={jobSelectorProps}>
          <ExplorerNoJobsFound />
        </ExplorerPage>
      );
    }

    if (hasResultsWithAnomalies === false && !loading) {
      return (
        <ExplorerPage jobSelectorProps={jobSelectorProps}>
          <ExplorerNoResultsFound
            hasResults={hasResults}
            selectedJobsRunning={selectedJobsRunning}
          />
        </ExplorerPage>
      );
    }
    const mainColumnWidthClassName = noInfluencersConfigured === true ? 'col-xs-12' : 'col-xs-10';
    const mainColumnClasses = `column ${mainColumnWidthClassName}`;

    const bounds = timefilter.getActiveBounds();
    const selectedJobIds = Array.isArray(selectedJobs) ? selectedJobs.map((job) => job.id) : [];
    return (
      <ExplorerPage
        jobSelectorProps={jobSelectorProps}
        noInfluencersConfigured={noInfluencersConfigured}
        influencers={influencers}
        filterActive={filterActive}
        filterPlaceHolder={filterPlaceHolder}
        filterIconTriggeredQuery={this.state.filterIconTriggeredQuery}
        indexPattern={indexPattern}
        queryString={queryString}
        updateLanguage={this.updateLanguage}
      >
        <div className="results-container">
          {noInfluencersConfigured && (
            <div className="no-influencers-warning">
              <EuiIconTip
                content={i18n.translate('xpack.ml.explorer.noConfiguredInfluencersTooltip', {
                  defaultMessage:
                    'The Top Influencers list is hidden because no influencers have been configured for the selected jobs.',
                })}
                position="right"
                type="iInCircle"
              />
            </div>
          )}

          {noInfluencersConfigured === false && (
            <div className="column col-xs-2" data-test-subj="mlAnomalyExplorerInfluencerList">
              <EuiTitle className="panel-title">
                <h2>
                  <FormattedMessage
                    id="xpack.ml.explorer.topInfuencersTitle"
                    defaultMessage="Top influencers"
                  />
                  <EuiIconTip
                    content={
                      <FormattedMessage
                        id="xpack.ml.explorer.topInfluencersTooltip"
                        defaultMessage="View the relative impact of the top influencers in the selected time period and add them as filters on the results. Each influencer has a maximum anomaly score between 0-100 and a total anomaly score for that period."
                      />
                    }
                    position="right"
                  />
                </h2>
              </EuiTitle>
              {loading ? (
                <EuiLoadingContent lines={10} />
              ) : (
                <InfluencersList influencers={influencers} influencerFilter={this.applyFilter} />
              )}
            </div>
          )}

          <div className={mainColumnClasses}>
            <EuiSpacer size="m" />
            {stoppedPartitions && (
              <EuiCallOut
                size={'s'}
                title={
                  <FormattedMessage
                    id="xpack.ml.explorer.stoppedPartitionsExistCallout"
                    defaultMessage="There may be fewer results than there could have been because stop_on_warn is turned on. Both categorization and subsequent anomaly detection have stopped for some partitions in {jobsWithStoppedPartitions, plural, one {job} other {jobs}} [{stoppedPartitions}] where the categorization status has changed to warn."
                    values={{
                      jobsWithStoppedPartitions: stoppedPartitions.length,
                      stoppedPartitions: stoppedPartitions.join(', '),
                    }}
                  />
                }
              />
            )}

            <AnomalyTimeline
              explorerState={this.props.explorerState}
              setSelectedCells={this.props.setSelectedCells}
            />
            <EuiSpacer size="m" />
            {annotationsError !== undefined && (
              <>
                <EuiTitle
                  className="panel-title"
                  data-test-subj="mlAnomalyExplorerAnnotationsPanel error"
                >
                  <h2>
                    <FormattedMessage
                      id="xpack.ml.explorer.annotationsErrorTitle"
                      defaultMessage="Annotations"
                    />
                  </h2>
                </EuiTitle>
                <EuiPanel>
                  <EuiCallOut
                    title={i18n.translate('xpack.ml.explorer.annotationsErrorCallOutTitle', {
                      defaultMessage: 'An error occurred loading annotations:',
                    })}
                    color="danger"
                    iconType="alert"
                  >
                    <p>{annotationsError}</p>
                  </EuiCallOut>
                </EuiPanel>
                <EuiSpacer size="m" />
              </>
            )}
            {annotationsData.length > 0 && (
              <>
                <EuiPanel data-test-subj="mlAnomalyExplorerAnnotationsPanel loaded">
                  <EuiAccordion
                    id={this.htmlIdGen()}
                    buttonContent={
                      <EuiTitle className="panel-title">
                        <h2>
                          <FormattedMessage
                            id="xpack.ml.explorer.annotationsTitle"
                            defaultMessage="Annotations {badge}"
                            values={{
                              badge: (
                                <EuiBadge color={'hollow'}>
                                  <FormattedMessage
                                    id="xpack.ml.explorer.annotationsTitleTotalCount"
                                    defaultMessage="Total: {count}"
                                    values={{ count: annotationsData.length }}
                                  />
                                </EuiBadge>
                              ),
                            }}
                          />
                        </h2>
                      </EuiTitle>
                    }
                  >
                    <>
                      <AnnotationsTable
                        jobIds={selectedJobIds}
                        annotations={annotationsData}
                        aggregations={aggregations}
                        drillDown={true}
                        numberBadge={false}
                      />
                    </>
                  </EuiAccordion>
                </EuiPanel>
                <AnnotationFlyout />
                <EuiSpacer size="m" />
              </>
            )}
            {loading === false && (
              <EuiPanel>
                <EuiFlexGroup direction="row" gutterSize="m" responsive={false} alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiTitle className="panel-title">
                      <h2>
                        <FormattedMessage
                          id="xpack.ml.explorer.anomaliesTitle"
                          defaultMessage="Anomalies"
                        />
                      </h2>
                    </EuiTitle>
                  </EuiFlexItem>

                  <EuiFlexItem grow={false} style={{ marginLeft: 'auto', alignSelf: 'baseline' }}>
                    <AnomalyContextMenu
                      selectedJobs={selectedJobs}
                      selectedCells={selectedCells}
                      bounds={bounds}
                      interval={
                        this.props.explorerState.swimlaneBucketInterval
                          ? this.props.explorerState.swimlaneBucketInterval.asSeconds()
                          : undefined
                      }
                      chartsCount={chartsData.seriesToPlot.length}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>

                <EuiFlexGroup
                  direction="row"
                  gutterSize="l"
                  responsive={true}
                  className="ml-anomalies-controls"
                >
                  <EuiFlexItem grow={false} style={{ width: '170px' }}>
                    <EuiFormRow
                      label={i18n.translate('xpack.ml.explorer.severityThresholdLabel', {
                        defaultMessage: 'Severity threshold',
                      })}
                    >
                      <SelectSeverity />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false} style={{ width: '170px' }}>
                    <EuiFormRow
                      label={i18n.translate('xpack.ml.explorer.intervalLabel', {
                        defaultMessage: 'Interval',
                      })}
                    >
                      <SelectInterval />
                    </EuiFormRow>
                  </EuiFlexItem>
                  {chartsData.seriesToPlot.length > 0 && selectedCells !== undefined && (
                    <EuiFlexItem grow={false} style={{ alignSelf: 'center' }}>
                      <EuiFormRow label="&#8203;">
                        <CheckboxShowCharts />
                      </EuiFormRow>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>

                <EuiSpacer size="m" />

                <div className="euiText explorer-charts">
                  {showCharts && (
                    <ExplorerChartsContainer
                      {...{
                        ...chartsData,
                        severity,
                        timefilter,
                        mlUrlGenerator,
                        timeBuckets,
                        onSelectEntity: this.applyFilter,
                      }}
                    />
                  )}
                </div>

                <AnomaliesTable
                  bounds={bounds}
                  tableData={tableData}
                  influencerFilter={this.applyFilter}
                />
              </EuiPanel>
            )}
          </div>
        </div>
      </ExplorerPage>
    );
  }
}

export const Explorer = withKibana(ExplorerUI);
