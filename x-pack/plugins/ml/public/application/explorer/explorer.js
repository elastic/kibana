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
import { FormattedMessage } from '@kbn/i18n-react';

import {
  htmlIdGenerator,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIconTip,
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
import { ExplorerNoJobsSelected, ExplorerNoResultsFound } from './components';
import { InfluencersList } from '../components/influencers_list';
import { explorerService } from './explorer_dashboard_service';
import { AnomalyResultsViewSelector } from '../components/anomaly_results_view_selector';
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

// Anomalies Map
import { AnomaliesMap } from './anomalies_map';

import { getToastNotifications } from '../util/dependency_cache';
import { ANOMALY_DETECTION_DEFAULT_TIME_RANGE } from '../../../common/constants/settings';
import { withKibana } from '../../../../../../src/plugins/kibana_react/public';
import { ML_APP_LOCATOR } from '../../../common/constants/locator';
import { AnomalyContextMenu } from './anomaly_context_menu';
import { isDefined } from '../../../common/types/guards';
import { MlPageHeader } from '../components/page_header';

const ExplorerPage = ({
  children,
  jobSelectorProps,
  noInfluencersConfigured,
  influencers,
  filterActive,
  filterPlaceHolder,
  indexPattern,
  queryString,
  updateLanguage,
}) => (
  <>
    <MlPageHeader>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <AnomalyResultsViewSelector viewId="explorer" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FormattedMessage id="xpack.ml.explorer.pageTitle" defaultMessage="Anomaly Explorer" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </MlPageHeader>
    <EuiPageHeader>
      <EuiPageHeaderSection style={{ width: '100%' }}>
        <JobSelector {...jobSelectorProps} />

        {noInfluencersConfigured === false && influencers !== undefined ? (
          <>
            <ExplorerQueryBar
              filterActive={filterActive}
              filterPlaceHolder={filterPlaceHolder}
              indexPattern={indexPattern}
              queryString={queryString}
              updateLanguage={updateLanguage}
            />
            <EuiSpacer size="m" />
            <EuiHorizontalRule margin="none" />
          </>
        ) : null}
      </EuiPageHeaderSection>
    </EuiPageHeader>
    {children}
  </>
);

export class ExplorerUI extends React.Component {
  static propTypes = {
    explorerState: PropTypes.object.isRequired,
    setSelectedCells: PropTypes.func.isRequired,
    severity: PropTypes.number.isRequired,
    showCharts: PropTypes.bool.isRequired,
    selectedJobsRunning: PropTypes.bool.isRequired,
  };

  state = { language: DEFAULT_QUERY_LANG };
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
    const { share } = this.props.kibana.services;

    const mlLocator = share.url.locators.get(ML_APP_LOCATOR);

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
      swimLaneSeverity,
    } = this.props.explorerState;
    const { annotationsData, totalCount: allAnnotationsCnt, error: annotationsError } = annotations;

    const annotationsCnt = Array.isArray(annotationsData) ? annotationsData.length : 0;
    const badge =
      allAnnotationsCnt > annotationsCnt ? (
        <EuiBadge color={'hollow'}>
          <FormattedMessage
            id="xpack.ml.explorer.annotationsOutOfTotalCountTitle"
            defaultMessage="First {visibleCount} out of a total of {totalCount}"
            values={{ visibleCount: annotationsCnt, totalCount: allAnnotationsCnt }}
          />
        </EuiBadge>
      ) : (
        <EuiBadge color={'hollow'}>
          <FormattedMessage
            id="xpack.ml.explorer.annotationsTitleTotalCount"
            defaultMessage="Total: {count}"
            values={{ count: annotationsCnt }}
          />
        </EuiBadge>
      );

    const jobSelectorProps = {
      dateFormatTz: getDateFormatTz(),
    };

    const noJobsSelected = selectedJobs === null || selectedJobs.length === 0;
    const hasResults = overallSwimlaneData.points && overallSwimlaneData.points.length > 0;
    const hasResultsWithAnomalies =
      (hasResults && overallSwimlaneData.points.some((v) => v.value > 0)) ||
      tableData.anomalies?.length > 0;

    const hasActiveFilter = isDefined(swimLaneSeverity);

    if (noJobsSelected && !loading) {
      return (
        <ExplorerPage jobSelectorProps={jobSelectorProps}>
          <ExplorerNoJobsSelected />
        </ExplorerPage>
      );
    }

    if (!hasResultsWithAnomalies && !loading && !hasActiveFilter) {
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
              <EuiSpacer size={'s'} />
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
            {loading === false && tableData.anomalies?.length ? (
              <AnomaliesMap anomalies={tableData.anomalies} jobIds={selectedJobIds} />
            ) : null}
            {annotationsCnt > 0 && (
              <>
                <EuiPanel
                  data-test-subj="mlAnomalyExplorerAnnotationsPanel loaded"
                  hasBorder
                  hasShadow={false}
                >
                  <EuiAccordion
                    id={this.htmlIdGen()}
                    buttonContent={
                      <EuiTitle
                        className="panel-title"
                        data-test-subj="mlAnomalyExplorerAnnotationsPanelButton"
                      >
                        <h2>
                          <FormattedMessage
                            id="xpack.ml.explorer.annotationsTitle"
                            defaultMessage="Annotations {badge}"
                            values={{
                              badge,
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
              <EuiPanel hasBorder hasShadow={false}>
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

                <EuiFlexGroup direction="row" gutterSize="l" responsive={true} alignItems="center">
                  <EuiFlexItem grow={false}>
                    <SelectSeverity />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <SelectInterval />
                  </EuiFlexItem>
                  {chartsData.seriesToPlot.length > 0 && selectedCells !== undefined && (
                    <EuiFlexItem grow={false}>
                      <CheckboxShowCharts
                        showCharts={showCharts}
                        setShowCharts={explorerService.setShowCharts}
                      />
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>

                <EuiSpacer size="m" />

                <div className="euiText explorer-charts">
                  {showCharts ? (
                    <ExplorerChartsContainer
                      {...{
                        ...chartsData,
                        severity,
                        timefilter,
                        mlLocator,
                        timeBuckets,
                        onSelectEntity: this.applyFilter,
                      }}
                    />
                  ) : null}
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
