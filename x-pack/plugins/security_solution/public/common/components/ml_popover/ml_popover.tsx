/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiHeaderSectionItemButton,
  EuiCallOut,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useState, useMemo } from 'react';
import styled from 'styled-components';
import { MLJobsAwaitingNodeWarning } from '@kbn/ml-plugin/public';
import { useKibana } from '../../lib/kibana';
import { filterJobs } from './helpers';
import { JobsTableFilters } from './jobs_table/filters/jobs_table_filters';
import { JobsTable } from './jobs_table/jobs_table';
import { ShowingCount } from './jobs_table/showing_count';
import { PopoverDescription } from './popover_description';
import * as i18n from './translations';
import type { JobsFilters, SecurityJob } from './types';
import { UpgradeContents } from './upgrade_contents';
import { useSecurityJobs } from './hooks/use_security_jobs';
import { useEnableDataFeed } from './hooks/use_enable_data_feed';

const PopoverContentsDiv = styled.div`
  max-width: 684px;
  max-height: 90vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 15px;
`;

PopoverContentsDiv.displayName = 'PopoverContentsDiv';

const defaultFilterProps: JobsFilters = {
  filterQuery: '',
  showCustomJobs: false,
  showElasticJobs: false,
  selectedGroups: [],
};

export const MlPopover = React.memo(() => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [filterProperties, setFilterProperties] = useState(defaultFilterProps);
  const {
    isMlAdmin,
    isLicensed,
    loading: isLoadingSecurityJobs,
    jobs,
    refetch: refreshJobs,
  } = useSecurityJobs();

  const docLinks = useKibana().services.docLinks;
  const { enableDatafeed, isLoading: isLoadingEnableDataFeed } = useEnableDataFeed();
  const handleJobStateChange = useCallback(
    async (job: SecurityJob, latestTimestampMs: number, enable: boolean) => {
      const result = await enableDatafeed(job, latestTimestampMs, enable);
      refreshJobs();
      return result;
    },
    [refreshJobs, enableDatafeed]
  );

  const filteredJobs = filterJobs({
    jobs,
    ...filterProperties,
  });

  const incompatibleJobCount = jobs.filter((j) => !j.isCompatible).length;
  const installedJobsIds = useMemo(
    () => jobs.filter((j) => j.isInstalled).map((j) => j.id),
    [jobs]
  );

  if (!isLicensed) {
    // If the user does not have platinum show upgrade UI
    return (
      <EuiPopover
        anchorPosition="downRight"
        id="integrations-popover"
        button={
          <EuiHeaderSectionItemButton
            aria-expanded={isPopoverOpen}
            aria-haspopup="true"
            aria-label={i18n.ML_JOB_SETTINGS}
            color="primary"
            data-test-subj="integrations-button"
            iconType="arrowDown"
            iconSide="right"
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            textProps={{ style: { fontSize: '1rem' } }}
          >
            {i18n.ML_JOB_SETTINGS}
          </EuiHeaderSectionItemButton>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(!isPopoverOpen)}
        repositionOnScroll
      >
        <UpgradeContents />
      </EuiPopover>
    );
  } else if (isMlAdmin) {
    // If the user has Platinum License & ML Admin Permissions, show Anomaly Detection button & full config UI
    return (
      <EuiPopover
        anchorPosition="downRight"
        id="integrations-popover"
        button={
          <EuiHeaderSectionItemButton
            aria-expanded={isPopoverOpen}
            aria-haspopup="true"
            aria-label={i18n.ML_JOB_SETTINGS}
            color="primary"
            data-test-subj="integrations-button"
            iconType="arrowDown"
            iconSide="right"
            onClick={() => {
              setIsPopoverOpen(!isPopoverOpen);
              refreshJobs();
            }}
            textProps={{ style: { fontSize: '1rem' } }}
          >
            {i18n.ML_JOB_SETTINGS}
          </EuiHeaderSectionItemButton>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(!isPopoverOpen)}
        repositionOnScroll
      >
        <PopoverContentsDiv data-test-subj="ml-popover-contents">
          <EuiPopoverTitle>{i18n.ML_JOB_SETTINGS}</EuiPopoverTitle>
          <PopoverDescription />

          <EuiSpacer />

          <JobsTableFilters securityJobs={jobs} onFilterChanged={setFilterProperties} />

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
                          href={`${docLinks.links.siem.ml}`}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {i18n.ANOMALY_DETECTION_DOCS}
                        </a>
                      ),
                    }}
                  />
                </p>
              </EuiCallOut>

              <EuiSpacer size="m" />
            </>
          )}

          <MLJobsAwaitingNodeWarning jobIds={installedJobsIds} />
          <JobsTable
            isLoading={isLoadingSecurityJobs || isLoadingEnableDataFeed}
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

MlPopover.displayName = 'MlPopover';
