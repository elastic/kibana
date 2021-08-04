/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { EuiCallOut, EuiText, EuiAccordion, EuiSpacer } from '@elastic/eui';
import type { JobDependencies } from './jobs_export_service';

interface Props {
  jobs: JobDependencies;
}

export const ExportJobDependenciesWarningCallout: FC<Props> = ({ jobs: allJobs }) => {
  const usingCalendars = allJobs.some((j) => j.calendarIds.length > 0);
  const usingFilters = allJobs.some((j) => j.filterIds.length > 0);

  const jobs = allJobs.filter(
    ({ calendarIds, filterIds }) => calendarIds.length > 0 || filterIds.length > 0
  );

  if (usingCalendars === false && usingFilters === false) {
    return null;
  }

  return (
    <>
      <EuiCallOut title={getTitle(jobs)} color="warning">
        <FormattedMessage
          id="xpack.ml.importExport.exportFlyout.exportJobDependenciesWarningCallout.calendarDependencies"
          defaultMessage="When importing jobs into a new environment, calendars and filters which are relied upon by jobs will need to be recreated."
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
            <CalendarJobList jobs={jobs} />
          </EuiAccordion>
        )}

        {usingFilters && (
          <EuiAccordion
            id="advancedOptions"
            paddingSize="s"
            aria-label={i18n.translate(
              'xpack.ml.importExport.exportFlyout.exportJobDependenciesWarningCallout.jobUsingFiltersAria',
              {
                defaultMessage: 'Jobs using filters',
              }
            )}
            buttonContent={
              <FormattedMessage
                id="xpack.ml.importExport.exportFlyout.exportJobDependenciesWarningCallout.jobUsingFiltersButton"
                defaultMessage="Jobs using filters"
              />
            }
          >
            <FilterJobList jobs={jobs} />
          </EuiAccordion>
        )}
      </EuiCallOut>

      <EuiSpacer size="m" />
    </>
  );
};

const CalendarJobList: FC<{ jobs: JobDependencies }> = ({ jobs }) => {
  return (
    <>
      {jobs.length > 0 && (
        <>
          {jobs
            .filter(({ calendarIds }) => calendarIds.length > 0)
            .map(({ jobId, calendarIds }) => (
              <>
                <EuiText size="s">
                  <h5>{jobId}</h5>
                  {calendarIds.length > 0 && (
                    <FormattedMessage
                      id="xpack.ml.importExport.exportFlyout.exportJobDependenciesWarningCallout.calendarDependencies"
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
};

const FilterJobList: FC<{ jobs: JobDependencies }> = ({ jobs }) => (
  <>
    {jobs.length > 0 && (
      <>
        {jobs
          .filter(({ filterIds }) => filterIds.length > 0)
          .map(({ jobId, filterIds }) => (
            <>
              <EuiText size="s">
                <h5>{jobId}</h5>
                {filterIds.length > 0 && (
                  <FormattedMessage
                    id="xpack.ml.importExport.exportFlyout.exportJobDependenciesWarningCallout.filterDependencies"
                    defaultMessage="{num, plural, one {filter} other {filters}}: {filters}"
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

function getTitle(jobs: JobDependencies) {
  const calendarCount = jobs.reduce((a, { calendarIds }) => a + calendarIds.length, 0);
  const filterCount = jobs.reduce((a, { filterIds }) => a + filterIds.length, 0);

  if (calendarCount > 0 && filterCount === 0) {
    return i18n.translate(
      'xpack.ml.importExport.exportFlyout.exportJobDependenciesWarningCallout.calendarOnlyTitle',
      {
        defaultMessage:
          '{jobCount, plural, one {# selected job has} other {# selected jobs have}} dependencies on {calendarCount, plural, one {a calendar} other {calendars}}',
        values: { jobCount: jobs.length, calendarCount },
      }
    );
  }

  if (calendarCount === 0 && filterCount > 0) {
    return i18n.translate(
      'xpack.ml.importExport.exportFlyout.exportJobDependenciesWarningCallout.filterOnlyTitle',
      {
        defaultMessage:
          '{jobCount, plural, one {# selected job has} other {# selected jobs have}} dependencies on {filterCount, plural, one {a filter} other {filters}}',
        values: { jobCount: jobs.length, filterCount },
      }
    );
  }

  return i18n.translate(
    'xpack.ml.importExport.exportFlyout.exportJobDependenciesWarningCallout.filterAndCalendarTitle',
    {
      defaultMessage:
        '{jobCount, plural, one {# selected job has} other {# selected jobs have}} dependencies on filters and calendars',
      values: { jobCount: jobs.length },
    }
  );
}
