/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiTitle,
  EuiSpacer,
  EuiIconTip,
  EuiFlexItem,
  EuiFlexGroup,
} from '@elastic/eui';

import { JobStatus } from '../../job_status';

export class TabSummary extends Component {
  static propTypes = {
    job: PropTypes.object.isRequired,
    stats: PropTypes.object,
  };

  renderStats() {
    const { stats } = this.props;

    if (!stats) {
      return null;
    }

    const { documentsProcessed, pagesProcessed, rollupsIndexed, triggerCount, status } = stats;

    return (
      <section
        aria-labelledby="rollupJobDetailStatsTitle"
        data-test-subj="rollupJobDetailSummaryStatsSection"
      >
        <EuiSpacer size="l" />

        <EuiTitle size="s">
          <h3 id="rollupJobDetailStatsTitle" data-test-subj="rollupJobDetailStatsTitle">
            <FormattedMessage
              id="xpack.rollupJobs.jobDetails.tabSummary.sectionStatsTitle"
              defaultMessage="Stats"
            />
          </h3>
        </EuiTitle>

        <EuiSpacer size="s" />

        <JobStatus status={status} />

        <EuiSpacer size="s" />

        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiDescriptionList textStyle="reverse">
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.rollupJobs.jobDetails.tabSummary.itemDocumentsProcessedLabel"
                  data-test-subj="rollupJobDetailStatsDocumentsProcessedTitle"
                  defaultMessage="Documents processed"
                />
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription data-test-subj="rollupJobDetailStatsDocumentsProcessedDescription">
                {documentsProcessed}
              </EuiDescriptionListDescription>

              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.rollupJobs.jobDetails.tabSummary.itemRollupsIndexedLabel"
                  data-test-subj="rollupJobDetailStatsRollupsIndexedTitle"
                  defaultMessage="Rollups indexed"
                />
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription data-test-subj="rollupJobDetailStatsRollupsIndexedDescription">
                {rollupsIndexed}
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiDescriptionList textStyle="reverse">
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.rollupJobs.jobDetails.tabSummary.itemPagesProcessedLabel"
                  data-test-subj="rollupJobDetailStatsPagesProcessedTitle"
                  defaultMessage="Pages processed"
                />
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription data-test-subj="rollupJobDetailStatsPagesProcessedDescription">
                {pagesProcessed}
              </EuiDescriptionListDescription>

              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.rollupJobs.jobDetails.tabSummary.itemTriggerCountLabel"
                  data-test-subj="rollupJobDetailStatsTriggerCountTitle"
                  defaultMessage="Trigger count"
                />
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription data-test-subj="rollupJobDetailStatsTriggerCountDescription">
                {triggerCount}
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiFlexItem>
        </EuiFlexGroup>
      </section>
    );
  }

  render() {
    const { job } = this.props;

    const {
      indexPattern,
      rollupIndex,
      rollupCron,
      rollupDelay,
      dateHistogramInterval,
      dateHistogramTimeZone,
      dateHistogramField,
    } = job;

    return (
      <Fragment>
        <section
          aria-labelledby="rollupJobDetailLogisticsTitle"
          data-test-subj="rollupJobDetailSummaryLogisticsSection"
        >
          <EuiTitle size="s">
            <h3 id="rollupJobDetailLogisticsTitle" data-test-subj="rollupJobDetailLogisticsTitle">
              <FormattedMessage
                id="xpack.rollupJobs.jobDetails.tabSummary.sectionLogisticsLabel"
                defaultMessage="Logistics"
              />
            </h3>
          </EuiTitle>

          <EuiSpacer size="s" />

          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiDescriptionList textStyle="reverse">
                <EuiDescriptionListTitle>
                  <FormattedMessage
                    id="xpack.rollupJobs.jobDetails.tabSummary.itemIndexPatternLabel"
                    data-test-subj="rollupJobDetailLogisticsIndexPatternTitle"
                    defaultMessage="Index pattern"
                  />
                </EuiDescriptionListTitle>

                <EuiDescriptionListDescription
                  className="eui-textBreakWord"
                  data-test-subj="rollupJobDetailLogisticsIndexPatternDescription"
                >
                  {indexPattern}
                </EuiDescriptionListDescription>

                <EuiDescriptionListTitle>
                  <FormattedMessage
                    id="xpack.rollupJobs.jobDetails.tabSummary.itemCronLabel"
                    data-test-subj="rollupJobDetailLogisticsCronTitle"
                    defaultMessage="Cron"
                  />{' '}
                  <EuiIconTip
                    content={
                      <FormattedMessage
                        id="xpack.rollupJobs.jobDetails.tabSummary.itemCronTip"
                        defaultMessage="The frequency with which data is rolled up"
                      />
                    }
                  />
                </EuiDescriptionListTitle>

                <EuiDescriptionListDescription data-test-subj="rollupJobDetailLogisticsCronDescription">
                  {rollupCron}
                </EuiDescriptionListDescription>
              </EuiDescriptionList>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiDescriptionList textStyle="reverse">
                <EuiDescriptionListTitle>
                  <FormattedMessage
                    id="xpack.rollupJobs.jobDetails.tabSummary.itemRollupIndexLabel"
                    data-test-subj="rollupJobDetailLogisticsRollupIndexTitle"
                    defaultMessage="Rollup index"
                  />
                </EuiDescriptionListTitle>

                <EuiDescriptionListDescription
                  className="eui-textBreakWord"
                  data-test-subj="rollupJobDetailLogisticsRollupIndexDescription"
                >
                  {rollupIndex}
                </EuiDescriptionListDescription>

                <EuiDescriptionListTitle>
                  <FormattedMessage
                    id="xpack.rollupJobs.jobDetails.tabSummary.itemDelayLabel"
                    data-test-subj="rollupJobDetailLogisticsDelayTitle"
                    defaultMessage="Delay"
                  />
                </EuiDescriptionListTitle>

                <EuiDescriptionListDescription data-test-subj="rollupJobDetailLogisticsDelayDescription">
                  {rollupDelay || (
                    <FormattedMessage
                      id="xpack.rollupJobs.jobDetails.tabSummary.itemDelay.none"
                      defaultMessage="None"
                    />
                  )}
                </EuiDescriptionListDescription>
              </EuiDescriptionList>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="l" />
        </section>

        <section
          aria-labelledby="rollupJobDetailDateHistogramTitle"
          data-test-subj="rollupJobDetailSummaryDateHistogramSection"
        >
          <EuiTitle size="s">
            <h3
              id="rollupJobDetailDateHistogramTitle"
              data-test-subj="rollupJobDetailDateHistogramTitle"
            >
              <FormattedMessage
                id="xpack.rollupJobs.jobDetails.tabSummary.sectionDateHistogramLabel"
                defaultMessage="Date histogram"
              />
            </h3>
          </EuiTitle>

          <EuiSpacer size="s" />

          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiDescriptionList textStyle="reverse">
                <EuiDescriptionListTitle>
                  <FormattedMessage
                    id="xpack.rollupJobs.jobDetails.tabSummary.itemTimeFieldLabel"
                    data-test-subj="rollupJobDetailDateHistogramTimeFieldTitle"
                    defaultMessage="Time field"
                  />
                </EuiDescriptionListTitle>

                <EuiDescriptionListDescription
                  className="eui-textBreakWord"
                  data-test-subj="rollupJobDetailDateHistogramTimeFieldDescription"
                >
                  {dateHistogramField}
                </EuiDescriptionListDescription>
                <EuiDescriptionListTitle>
                  <FormattedMessage
                    id="xpack.rollupJobs.jobDetails.tabSummary.itemIntervalLabel"
                    data-test-subj="rollupJobDetailDateHistogramIntervalTitle"
                    defaultMessage="Interval"
                  />{' '}
                  <EuiIconTip
                    content={
                      <FormattedMessage
                        id="xpack.rollupJobs.jobDetails.tabSummary.itemIntervalTip"
                        defaultMessage="The time bucket interval into which data is rolled up"
                      />
                    }
                  />
                </EuiDescriptionListTitle>

                <EuiDescriptionListDescription data-test-subj="rollupJobDetailDateHistogramIntervalDescription">
                  {dateHistogramInterval}
                </EuiDescriptionListDescription>
              </EuiDescriptionList>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiDescriptionList textStyle="reverse">
                <EuiDescriptionListTitle>
                  <FormattedMessage
                    id="xpack.rollupJobs.jobDetails.tabSummary.itemTimezoneLabel"
                    data-test-subj="rollupJobDetailDateHistogramTimezoneTitle"
                    defaultMessage="Timezone"
                  />
                </EuiDescriptionListTitle>

                <EuiDescriptionListDescription data-test-subj="rollupJobDetailDateHistogramTimezoneDescription">
                  {dateHistogramTimeZone}
                </EuiDescriptionListDescription>
              </EuiDescriptionList>
            </EuiFlexItem>
          </EuiFlexGroup>
        </section>

        {this.renderStats()}
      </Fragment>
    );
  }
}
