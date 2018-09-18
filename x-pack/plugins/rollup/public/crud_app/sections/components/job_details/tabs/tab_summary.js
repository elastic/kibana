/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

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

export class TabSummaryUi extends Component {
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
              id="xpack.rollupJobs.jobDetails.tabSummary.sectionStats.title"
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
                  id="xpack.rollupJobs.jobDetails.tabSummary.itemDocumentsProcessed.label"
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
                  id="xpack.rollupJobs.jobDetails.tabSummary.itemPagesProcessed.label"
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
                  id="xpack.rollupJobs.jobDetails.tabSummary.itemRollupsIndexed.label"
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
                  id="xpack.rollupJobs.jobDetails.tabSummary.itemTriggerCount.label"
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
      dateHistogramInterval,
      dateHistogramDelay,
      dateHistogramTimeZone,
      dateHistogramField,
    } = job;

    return (
      <Fragment>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.rollupJobs.jobDetails.tabSummary.sectionLogistics.label"
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
                  id="xpack.rollupJobs.jobDetails.tabSummary.itemIndexPattern.label"
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
                  id="xpack.rollupJobs.jobDetails.tabSummary.itemRollupIndex.label"
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
                  id="xpack.rollupJobs.jobDetails.tabSummary.itemCron.label"
                  defaultMessage="Cron"
                />{' '}
                <EuiIconTip
                  content={(
                    <FormattedMessage
                      id="xpack.rollupJobs.jobDetails.tabSummary.itemCron.tip"
                      defaultMessage="Interval at which data is rolled up"
                    />
                  )}
                />
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription>
                {rollupCron}
              </EuiDescriptionListDescription>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiDescriptionList>

        <EuiSpacer size="l" />

        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.rollupJobs.jobDetails.tabSummary.sectionDateHistogram.label"
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
                  id="xpack.rollupJobs.jobDetails.tabSummary.itemTimeField.label"
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
                  id="xpack.rollupJobs.jobDetails.tabSummary.itemTimezone.label"
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
                  id="xpack.rollupJobs.jobDetails.tabSummary.itemDelay.label"
                  defaultMessage="Delay"
                />
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription>
                {dateHistogramDelay || (
                  <FormattedMessage
                    id="xpack.rollupJobs.jobDetails.tabSummary.itemDelay.none"
                    defaultMessage="None"
                  />
                )}
              </EuiDescriptionListDescription>
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.rollupJobs.jobDetails.tabSummary.itemInterval.label"
                  defaultMessage="Interval"
                />{' '}
                <EuiIconTip
                  content={(
                    <FormattedMessage
                      id="xpack.rollupJobs.jobDetails.tabSummary.itemInterval.tip"
                      defaultMessage="Time bucket interval generated at roll-up time"
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

export const TabSummary = injectI18n(TabSummaryUi);
