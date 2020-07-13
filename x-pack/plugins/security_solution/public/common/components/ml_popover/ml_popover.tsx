/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiCallOut, EuiPopover, EuiPopoverTitle, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import moment from 'moment';
import React, { Dispatch, useCallback, useReducer, useState } from 'react';
import styled from 'styled-components';

import { useKibana } from '../../lib/kibana';
import { METRIC_TYPE, TELEMETRY_EVENT, track } from '../../lib/telemetry';
import { hasMlAdminPermissions } from '../../../../common/machine_learning/has_ml_admin_permissions';
import { errorToToaster, useStateToaster, ActionToaster } from '../toasters';
import { setupMlJob, startDatafeeds, stopDatafeeds } from './api';
import { filterJobs } from './helpers';
import { useSiemJobs } from './hooks/use_siem_jobs';
import { JobsTableFilters } from './jobs_table/filters/jobs_table_filters';
import { JobsTable } from './jobs_table/jobs_table';
import { ShowingCount } from './jobs_table/showing_count';
import { PopoverDescription } from './popover_description';
import * as i18n from './translations';
import { JobsFilters, SiemJob } from './types';
import { UpgradeContents } from './upgrade_contents';
import { useMlCapabilities } from './hooks/use_ml_capabilities';

const PopoverContentsDiv = styled.div`
  max-width: 684px;
`;

PopoverContentsDiv.displayName = 'PopoverContentsDiv';

interface State {
  isLoading: boolean;
  refreshToggle: boolean;
}

type Action = { type: 'refresh' } | { type: 'loading' } | { type: 'success' } | { type: 'failure' };

function mlPopoverReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'refresh': {
      return {
        ...state,
        refreshToggle: !state.refreshToggle,
      };
    }
    case 'loading': {
      return {
        ...state,
        isLoading: true,
      };
    }
    case 'success': {
      return {
        ...state,
        isLoading: false,
      };
    }
    case 'failure': {
      return {
        ...state,
        isLoading: false,
      };
    }
    default:
      return state;
  }
}

const initialState: State = {
  isLoading: false,
  refreshToggle: true,
};

const defaultFilterProps: JobsFilters = {
  filterQuery: '',
  showCustomJobs: false,
  showElasticJobs: false,
  selectedGroups: [],
};

export const MlPopover = React.memo(() => {
  const [{ isLoading, refreshToggle }, dispatch] = useReducer(mlPopoverReducer, initialState);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [filterProperties, setFilterProperties] = useState(defaultFilterProps);
  const [isLoadingSiemJobs, siemJobs] = useSiemJobs(refreshToggle);
  const [, dispatchToaster] = useStateToaster();
  const capabilities = useMlCapabilities();
  const docLinks = useKibana().services.docLinks;
  const handleJobStateChange = useCallback(
    (job: SiemJob, latestTimestampMs: number, enable: boolean) =>
      enableDatafeed(job, latestTimestampMs, enable, dispatch, dispatchToaster),
    [dispatch, dispatchToaster]
  );

  const filteredJobs = filterJobs({
    jobs: siemJobs,
    ...filterProperties,
  });

  const incompatibleJobCount = siemJobs.filter((j) => !j.isCompatible).length;

  if (!capabilities.isPlatinumOrTrialLicense) {
    // If the user does not have platinum show upgrade UI
    return (
      <EuiPopover
        anchorPosition="downRight"
        id="integrations-popover"
        button={
          <EuiButtonEmpty
            data-test-subj="integrations-button"
            iconType="arrowDown"
            iconSide="right"
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          >
            {i18n.ML_JOB_SETTINGS}
          </EuiButtonEmpty>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(!isPopoverOpen)}
        repositionOnScroll
      >
        <UpgradeContents />
      </EuiPopover>
    );
  } else if (hasMlAdminPermissions(capabilities)) {
    // If the user has Platinum License & ML Admin Permissions, show Anomaly Detection button & full config UI
    return (
      <EuiPopover
        anchorPosition="downRight"
        id="integrations-popover"
        button={
          <EuiButtonEmpty
            data-test-subj="integrations-button"
            iconType="arrowDown"
            iconSide="right"
            onClick={() => {
              setIsPopoverOpen(!isPopoverOpen);
              dispatch({ type: 'refresh' });
            }}
          >
            {i18n.ML_JOB_SETTINGS}
          </EuiButtonEmpty>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(!isPopoverOpen)}
        repositionOnScroll
      >
        <PopoverContentsDiv data-test-subj="ml-popover-contents">
          <EuiPopoverTitle>{i18n.ML_JOB_SETTINGS}</EuiPopoverTitle>
          <PopoverDescription />

          <EuiSpacer />

          <JobsTableFilters siemJobs={siemJobs} onFilterChanged={setFilterProperties} />

          <ShowingCount filterResultsLength={filteredJobs.length} />

          <EuiSpacer size="m" />

          {incompatibleJobCount > 0 && (
            <>
              <EuiCallOut
                title={i18n.MODULE_NOT_COMPATIBLE_TITLE(incompatibleJobCount)}
                color="warning"
                iconType="alert"
                size="s"
              >
                <p>
                  <FormattedMessage
                    defaultMessage="We could not find any data, see {mlDocs} for more information on Machine Learning job requirements."
                    id="xpack.securitySolution.components.mlPopup.moduleNotCompatibleDescription"
                    values={{
                      mlDocs: (
                        <a
                          href={`${docLinks.ELASTIC_WEBSITE_URL}guide/en/security/${docLinks.DOC_LINK_VERSION}/machine-learning.html`}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {'Anomaly Detection with Machine Learning'}
                        </a>
                      ),
                    }}
                  />
                </p>
              </EuiCallOut>

              <EuiSpacer size="m" />
            </>
          )}

          <JobsTable
            isLoading={isLoadingSiemJobs || isLoading}
            jobs={filteredJobs}
            onJobStateChange={handleJobStateChange}
          />
        </PopoverContentsDiv>
      </EuiPopover>
    );
  } else {
    // If the user has Platinum License & not ML Admin, hide Anomaly Detection button as they don't have permissions to configure
    return null;
  }
});

// Enable/Disable Job & Datafeed -- passed to JobsTable for use as callback on JobSwitch
const enableDatafeed = async (
  job: SiemJob,
  latestTimestampMs: number,
  enable: boolean,
  dispatch: Dispatch<Action>,
  dispatchToaster: Dispatch<ActionToaster>
) => {
  submitTelemetry(job, enable);

  if (!job.isInstalled) {
    dispatch({ type: 'loading' });
    try {
      await setupMlJob({
        configTemplate: job.moduleId,
        indexPatternName: job.defaultIndexPattern,
        jobIdErrorFilter: [job.id],
        groups: job.groups,
      });
      dispatch({ type: 'success' });
    } catch (error) {
      errorToToaster({ title: i18n.CREATE_JOB_FAILURE, error, dispatchToaster });
      dispatch({ type: 'failure' });
      dispatch({ type: 'refresh' });
      return;
    }
  }

  // Max start time for job is no more than two weeks ago to ensure job performance
  const maxStartTime = moment.utc().subtract(14, 'days').valueOf();

  if (enable) {
    const startTime = Math.max(latestTimestampMs, maxStartTime);
    try {
      await startDatafeeds({ datafeedIds: [`datafeed-${job.id}`], start: startTime });
    } catch (error) {
      track(METRIC_TYPE.COUNT, TELEMETRY_EVENT.JOB_ENABLE_FAILURE);
      errorToToaster({ title: i18n.START_JOB_FAILURE, error, dispatchToaster });
    }
  } else {
    try {
      await stopDatafeeds({ datafeedIds: [`datafeed-${job.id}`] });
    } catch (error) {
      track(METRIC_TYPE.COUNT, TELEMETRY_EVENT.JOB_DISABLE_FAILURE);
      errorToToaster({ title: i18n.STOP_JOB_FAILURE, error, dispatchToaster });
    }
  }
  dispatch({ type: 'refresh' });
};

const submitTelemetry = (job: SiemJob, enabled: boolean) => {
  // Report type of job enabled/disabled
  track(
    METRIC_TYPE.COUNT,
    job.isElasticJob
      ? enabled
        ? TELEMETRY_EVENT.SIEM_JOB_ENABLED
        : TELEMETRY_EVENT.SIEM_JOB_DISABLED
      : enabled
      ? TELEMETRY_EVENT.CUSTOM_JOB_ENABLED
      : TELEMETRY_EVENT.CUSTOM_JOB_DISABLED
  );
};

MlPopover.displayName = 'MlPopover';
