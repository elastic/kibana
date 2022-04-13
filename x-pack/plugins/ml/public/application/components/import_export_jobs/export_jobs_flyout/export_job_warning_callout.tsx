/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { EuiCallOut, EuiText, EuiAccordion, EuiSpacer } from '@elastic/eui';
import type { JobDependencies } from './jobs_export_service';

interface Props {
  jobs: JobDependencies;
}

export const ExportJobDependenciesWarningCallout: FC<Props> = ({ jobs: allJobs }) => {
  const [jobs, jobsWithCalendars, jobsWithFilters] = filterJobs(allJobs);
  const usingCalendars = jobsWithCalendars.length > 0;
  const usingFilters = jobsWithFilters.length > 0;

  if (usingCalendars === false && usingFilters === false) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        title={getTitle(jobs, jobsWithCalendars.length, jobsWithFilters.length)}
        color="warning"
      >
        <FormattedMessage
          id="xpack.ml.importExport.exportFlyout.exportJobDependenciesWarningCallout.calendarDependencies"
          defaultMessage="When you export jobs, calendars and filter lists are not included. You must create the filter lists before you import jobs; otherwise, the import fails. If you want the new jobs to continue to ignore scheduled events, you must create the calendars."
        />
        <EuiSpacer />

        {usingCalendars && (
          <EuiAccordion
            id="advancedOptions"
            paddingSize="s"
            aria-label={i18n.translate(
              'xpack.ml.importExport.exportFlyout.exportJobDependenciesWarningCallout.jobUsingCalendarsAria',
              {
                defaultMessage: 'Jobs using calendars',
              }
            )}
            buttonContent={
              <FormattedMessage
                id="xpack.ml.importExport.exportFlyout.exportJobDependenciesWarningCallout.jobUsingCalendarsButton"
                defaultMessage="Jobs using calendars"
              />
            }
          >
            <CalendarJobList jobs={jobsWithCalendars} />
          </EuiAccordion>
        )}

        {usingFilters && (
          <EuiAccordion
            id="advancedOptions"
            paddingSize="s"
            aria-label={i18n.translate(
              'xpack.ml.importExport.exportFlyout.exportJobDependenciesWarningCallout.jobUsingFiltersAria',
              {
                defaultMessage: 'Jobs using filter lists',
              }
            )}
            buttonContent={
              <FormattedMessage
                id="xpack.ml.importExport.exportFlyout.exportJobDependenciesWarningCallout.jobUsingFiltersButton"
                defaultMessage="Jobs using filter lists"
              />
            }
          >
            <FilterJobList jobs={jobsWithFilters} />
          </EuiAccordion>
        )}
      </EuiCallOut>

      <EuiSpacer size="m" />
    </>
  );
};

const CalendarJobList: FC<{ jobs: JobDependencies }> = ({ jobs }) => (
  <>
    {jobs.length > 0 && (
      <>
        {jobs.map(({ jobId, calendarIds }) => (
          <>
            <EuiText size="s">
              <h5>{jobId}</h5>
              {calendarIds.length > 0 && (
                <FormattedMessage
                  id="xpack.ml.importExport.exportFlyout.exportJobDependenciesWarningCallout.calendarList"
                  defaultMessage="{num, plural, one {calendar} other {calendars}}: {calendars}"
                  values={{ num: calendarIds.length, calendars: calendarIds.join(', ') }}
                />
              )}
            </EuiText>
            <EuiSpacer size="s" />
          </>
        ))}
      </>
    )}
  </>
);

const FilterJobList: FC<{ jobs: JobDependencies }> = ({ jobs }) => (
  <>
    {jobs.length > 0 && (
      <>
        {jobs.map(({ jobId, filterIds }) => (
          <>
            <EuiText size="s">
              <h5>{jobId}</h5>
              {filterIds.length > 0 && (
                <FormattedMessage
                  id="xpack.ml.importExport.exportFlyout.exportJobDependenciesWarningCallout.filterList"
                  defaultMessage="Filter {num, plural, one {list} other {lists}}: {filters}"
                  values={{ num: filterIds.length, filters: filterIds.join(', ') }}
                />
              )}
            </EuiText>
            <EuiSpacer size="s" />
          </>
        ))}
      </>
    )}
  </>
);

function getTitle(jobs: JobDependencies, calendarCount: number, filterCount: number) {
  if (calendarCount > 0 && filterCount === 0) {
    return i18n.translate(
      'xpack.ml.importExport.exportFlyout.exportJobDependenciesWarningCallout.calendarOnlyTitle',
      {
        defaultMessage:
          '{jobCount, plural, one {# job uses} other {# jobs use}} {calendarCount, plural, one {a calendar} other {calendars}}',
        values: { jobCount: jobs.length, calendarCount },
      }
    );
  }

  if (calendarCount === 0 && filterCount > 0) {
    return i18n.translate(
      'xpack.ml.importExport.exportFlyout.exportJobDependenciesWarningCallout.filterOnlyTitle',
      {
        defaultMessage:
          '{jobCount, plural, one {# job uses} other {# jobs use}} {filterCount, plural, one {a filter list} other {filter lists}}',
        values: { jobCount: jobs.length, filterCount },
      }
    );
  }

  return i18n.translate(
    'xpack.ml.importExport.exportFlyout.exportJobDependenciesWarningCallout.filterAndCalendarTitle',
    {
      defaultMessage:
        '{jobCount, plural, one {# job uses} other {# jobs use}} filter lists and calendars',
      values: { jobCount: jobs.length },
    }
  );
}

function filterJobs(jobs: JobDependencies) {
  return jobs.reduce(
    (acc, job) => {
      const usingCalendars = job.calendarIds.length > 0;
      const usingFilters = job.filterIds.length > 0;
      if (usingCalendars || usingFilters) {
        acc[0].push(job);
        if (usingCalendars) {
          acc[1].push(job);
        }
        if (usingFilters) {
          acc[2].push(job);
        }
      }
      return acc;
    },
    [[], [], []] as JobDependencies[]
  );
}
