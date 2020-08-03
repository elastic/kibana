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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  htmlIdGenerator,
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

import { getTimefilter, getToastNotifications } from '../util/dependency_cache';

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

export class Explorer extends React.Component {
  static propTypes = {
    explorerState: PropTypes.object.isRequired,
    setSelectedCells: PropTypes.func.isRequired,
    severity: PropTypes.number.isRequired,
    showCharts: PropTypes.bool.isRequired,
  };

  state = { filterIconTriggeredQuery: undefined, language: DEFAULT_QUERY_LANG };
  htmlIdGen = htmlIdGenerator();

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
    const { showCharts, severity } = this.props;

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
    const { annotationsData, aggregations } = annotations;

    const jobSelectorProps = {
      dateFormatTz: getDateFormatTz(),
    };

    const noJobsFound = selectedJobs === null || selectedJobs.length === 0;
    const hasResults = overallSwimlaneData.points && overallSwimlaneData.points.length > 0;

    if (noJobsFound && !loading) {
      return (
        <ExplorerPage jobSelectorProps={jobSelectorProps}>
          <ExplorerNoJobsFound />
        </ExplorerPage>
      );
    }

    if (noJobsFound && hasResults === false && !loading) {
      return (
        <ExplorerPage jobSelectorProps={jobSelectorProps}>
          <ExplorerNoResultsFound />
        </ExplorerPage>
      );
    }
    const mainColumnWidthClassName = noInfluencersConfigured === true ? 'col-xs-12' : 'col-xs-10';
    const mainColumnClasses = `column ${mainColumnWidthClassName}`;

    const timefilter = getTimefilter();
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
            <AnomalyTimeline
              explorerState={this.props.explorerState}
              setSelectedCells={this.props.setSelectedCells}
            />
            <EuiSpacer size="m" />
            {annotationsData.length > 0 && (
              <>
                <EuiPanel>
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
                <EuiTitle className="panel-title">
                  <h2>
                    <FormattedMessage
                      id="xpack.ml.explorer.anomaliesTitle"
                      defaultMessage="Anomalies"
                    />
                  </h2>
                </EuiTitle>

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
                  {showCharts && <ExplorerChartsContainer {...{ ...chartsData, severity }} />}
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
