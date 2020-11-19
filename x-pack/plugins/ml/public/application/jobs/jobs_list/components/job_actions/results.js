/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React, { useMemo } from 'react';

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useCreateADLinks } from '../../../../components/custom_hooks/use_create_ad_links';

export function ResultLinks({ jobs }) {
  const openJobsInSingleMetricViewerText = i18n.translate(
    'xpack.ml.jobsList.resultActions.openJobsInSingleMetricViewerText',
    {
      defaultMessage:
        'Open {jobsCount, plural, one {{jobId}} other {# jobs}} in Single Metric Viewer',
      values: {
        jobsCount: jobs.length,
        jobId: jobs[0].id,
      },
    }
  );
  const openJobsInAnomalyExplorerText = i18n.translate(
    'xpack.ml.jobsList.resultActions.openJobsInAnomalyExplorerText',
    {
      defaultMessage: 'Open {jobsCount, plural, one {{jobId}} other {# jobs}} in Anomaly Explorer',
      values: {
        jobsCount: jobs.length,
        jobId: jobs[0].id,
      },
    }
  );
  const singleMetricVisible = jobs.length < 2;
  const singleMetricEnabled = jobs.length === 1 && jobs[0].isSingleMetricViewerJob;
  const singleMetricDisabledMessage =
    jobs.length === 1 && jobs[0].isNotSingleMetricViewerJobMessage;

  const singleMetricDisabledMessageText =
    singleMetricDisabledMessage !== undefined
      ? i18n.translate('xpack.ml.jobsList.resultActions.singleMetricDisabledMessageText', {
          defaultMessage: 'Disabled because {reason}',
          values: {
            reason: singleMetricDisabledMessage,
          },
        })
      : undefined;

  const jobActionsDisabled = jobs.length === 1 && jobs[0].deleting === true;
  const { createLinkWithUserDefaults } = useCreateADLinks();
  const timeSeriesExplorerLink = useMemo(
    () => createLinkWithUserDefaults('timeseriesexplorer', jobs),
    [jobs]
  );
  const anomalyExplorerLink = useMemo(() => createLinkWithUserDefaults('explorer', jobs), [jobs]);

  return (
    <React.Fragment>
      {singleMetricVisible && (
        <EuiToolTip
          position="bottom"
          content={singleMetricDisabledMessageText ?? openJobsInSingleMetricViewerText}
        >
          <EuiButtonIcon
            href={timeSeriesExplorerLink}
            iconType="visLine"
            aria-label={openJobsInSingleMetricViewerText}
            className="results-button"
            isDisabled={singleMetricEnabled === false || jobActionsDisabled === true}
            data-test-subj="mlOpenJobsInSingleMetricViewerFromManagementButton"
          />
        </EuiToolTip>
      )}
      <EuiToolTip position="bottom" content={openJobsInAnomalyExplorerText}>
        <EuiButtonIcon
          href={anomalyExplorerLink}
          iconType="visTable"
          aria-label={openJobsInSingleMetricViewerText}
          className="results-button"
          isDisabled={jobActionsDisabled === true}
          data-test-subj="mlOpenJobsInSingleMetricViewerFromManagementButton"
        />
      </EuiToolTip>
      <div className="actions-border" />
    </React.Fragment>
  );
}
ResultLinks.propTypes = {
  jobs: PropTypes.array.isRequired,
};
