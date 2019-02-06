/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';

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

    const {
      documentsProcessed,
      pagesProcessed,
      rollupsIndexed,
      triggerCount,
      status,
    } = stats;

    return (
      <Fragment>
        <EuiSpacer size="l" />

        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.rollupJobs.jobDetails.tabSummary.sectionStatsTitle"
              defaultMessage="Stats"
            />
          </h3>
        </EuiTitle>

        <EuiSpacer size="s" />

        <JobStatus status={status} />

        <EuiSpacer size="s" />

        <EuiDescriptionList textStyle="reverse">
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.rollupJobs.jobDetails.tabSummary.itemDocumentsProcessedLabel"
                  defaultMessage="Documents processed"
                />
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription>
                {documentsProcessed}
              </EuiDescriptionListDescription>
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.rollupJobs.jobDetails.tabSummary.itemPagesProcessedLabel"
                  defaultMessage="Pages processed"
                />
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription>
                {pagesProcessed}
              </EuiDescriptionListDescription>
            </EuiFlexItem>

          </EuiFlexGroup>

          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.rollupJobs.jobDetails.tabSummary.itemRollupsIndexedLabel"
                  defaultMessage="Rollups indexed"
                />
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription>
                {rollupsIndexed}
              </EuiDescriptionListDescription>
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.rollupJobs.jobDetails.tabSummary.itemTriggerCountLabel"
                  defaultMessage="Trigger count"
                />
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription>
                {triggerCount}
              </EuiDescriptionListDescription>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiDescriptionList>
      </Fragment>
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
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.rollupJobs.jobDetails.tabSummary.sectionLogisticsLabel"
              defaultMessage="Logistics"
            />
          </h3>
        </EuiTitle>

        <EuiSpacer size="s" />

        <EuiDescriptionList textStyle="reverse">
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.rollupJobs.jobDetails.tabSummary.itemIndexPatternLabel"
                  defaultMessage="Index pattern"
                />
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription className="eui-textBreakWord">
                {indexPattern}
              </EuiDescriptionListDescription>
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.rollupJobs.jobDetails.tabSummary.itemRollupIndexLabel"
                  defaultMessage="Rollup index"
                />
              </EuiDescriptionListTitle>


              <EuiDescriptionListDescription className="eui-textBreakWord">
                {rollupIndex}
              </EuiDescriptionListDescription>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.rollupJobs.jobDetails.tabSummary.itemCronLabel"
                  defaultMessage="Cron"
                />{' '}
                <EuiIconTip
                  content={(
                    <FormattedMessage
                      id="xpack.rollupJobs.jobDetails.tabSummary.itemCronTip"
                      defaultMessage="The frequency with which data is rolled up"
                    />
                  )}
                />
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription>
                {rollupCron}
              </EuiDescriptionListDescription>
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.rollupJobs.jobDetails.tabSummary.itemDelayLabel"
                  defaultMessage="Delay"
                />
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription>
                {rollupDelay || (
                  <FormattedMessage
                    id="xpack.rollupJobs.jobDetails.tabSummary.itemDelay.none"
                    defaultMessage="None"
                  />
                )}
              </EuiDescriptionListDescription>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiDescriptionList>

        <EuiSpacer size="l" />

        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.rollupJobs.jobDetails.tabSummary.sectionDateHistogramLabel"
              defaultMessage="Date histogram"
            />
          </h3>
        </EuiTitle>

        <EuiSpacer size="s" />

        <EuiDescriptionList textStyle="reverse">
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.rollupJobs.jobDetails.tabSummary.itemTimeFieldLabel"
                  defaultMessage="Time field"
                />
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription className="eui-textBreakWord">
                {dateHistogramField}
              </EuiDescriptionListDescription>
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.rollupJobs.jobDetails.tabSummary.itemTimezoneLabel"
                  defaultMessage="Timezone"
                />
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription>
                {dateHistogramTimeZone}
              </EuiDescriptionListDescription>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.rollupJobs.jobDetails.tabSummary.itemIntervalLabel"
                  defaultMessage="Interval"
                />{' '}
                <EuiIconTip
                  content={(
                    <FormattedMessage
                      id="xpack.rollupJobs.jobDetails.tabSummary.itemIntervalTip"
                      defaultMessage="The time bucket interval into which data is rolled up"
                    />
                  )}
                />
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription>
                {dateHistogramInterval}
              </EuiDescriptionListDescription>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiDescriptionList>

        {this.renderStats()}
      </Fragment>
    );
  }
}
