/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { EuiBasicTable, EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { from } from 'rxjs';
import { switchMap, takeWhile, tap } from 'rxjs/operators';
import { JobCreatorContext } from '../../../job_creator_context';
import { CategorizationJobCreator } from '../../../../../common/job_creator';
import { ml } from '../../../../../../../services/ml_api_service';
import { extractErrorProperties } from '../../../../../../../../../common/util/errors';

const NUMBER_OF_PREVIEW = 5;
export const CategoryStoppedPartitions: FC = () => {
  const { jobCreator: jc, resultsLoader } = useContext(JobCreatorContext);
  const jobCreator = jc as CategorizationJobCreator;
  const [tableRow, setTableRow] = useState<Array<{ partitionName: string }>>([]);
  const [stoppedPartitionsError, setStoppedPartitionsError] = useState<string | undefined>();

  const columns = useMemo(
    () => [
      {
        field: 'partitionName',
        name: i18n.translate(
          'xpack.ml.newJob.wizard.pickFieldsStep.stoppedPartitionsPreviewColumnName',
          {
            defaultMessage: 'Stopped partition names',
          }
        ),
        render: (partition: any) => (
          <EuiText size="s">
            <code>{partition}</code>
          </EuiText>
        ),
      },
    ],
    []
  );

  const loadCategoryStoppedPartitions = useCallback(async () => {
    try {
      const { jobs } = await ml.results.getCategoryStoppedPartitions([jobCreator.jobId]);

      if (
        !Array.isArray(jobs) && // if jobs is object of jobId: [partitions]
        Array.isArray(jobs[jobCreator.jobId]) &&
        jobs[jobCreator.jobId].length > 0
      ) {
        return jobs[jobCreator.jobId];
      }
    } catch (e) {
      const error = extractErrorProperties(e);
      // might get 404 because job has not been created yet and that's ok
      if (error.statusCode !== 404) {
        setStoppedPartitionsError(error.message);
      }
    }
  }, [jobCreator.jobId]);

  useEffect(() => {
    // only need to run this check if jobCreator.perPartitionStopOnWarn is turned on
    if (jobCreator.perPartitionCategorization && jobCreator.perPartitionStopOnWarn) {
      // subscribe to result updates
      const resultsSubscription = resultsLoader.results$
        .pipe(
          switchMap(() => {
            return from(loadCategoryStoppedPartitions());
          }),
          tap((results) => {
            if (Array.isArray(results)) {
              setTableRow(
                results.slice(0, NUMBER_OF_PREVIEW).map((partitionName) => ({
                  partitionName,
                }))
              );
            }
          }),
          takeWhile((results) => {
            return !results || (Array.isArray(results) && results.length <= NUMBER_OF_PREVIEW);
          })
        )
        .subscribe();
      return () => resultsSubscription.unsubscribe();
    }
  }, []);

  return (
    <>
      {stoppedPartitionsError && (
        <>
          <EuiSpacer />
          <EuiCallOut
            color={'danger'}
            size={'s'}
            title={
              <FormattedMessage
                id="xpack.ml.newJob.wizard.pickFieldsStep.stoppedPartitionsErrorCallout"
                defaultMessage="An error occurred while fetching list of stopped partitions."
              />
            }
          />
        </>
      )}
      {Array.isArray(tableRow) && tableRow.length > 0 && (
        <>
          <EuiSpacer />
          <div>
            <FormattedMessage
              id="xpack.ml.newJob.wizard.pickFieldsStep.categorizationStoppedPartitionsTitle"
              defaultMessage="Stopped partitions"
            />
          </div>
          <EuiSpacer size={'s'} />
          <EuiCallOut
            color={'warning'}
            size={'s'}
            title={
              <FormattedMessage
                id="xpack.ml.newJob.wizard.pickFieldsStep.stoppedPartitionsExistCallout"
                defaultMessage="Per-partition categorization and stop_on_warn settings are enabled. Some partitions in job '{jobId}' are unsuitable for categorization and have been excluded from further categorization or anomaly detection analysis."
                values={{
                  jobId: jobCreator.jobId,
                }}
              />
            }
          />
          <EuiBasicTable columns={columns} items={tableRow} />
        </>
      )}
    </>
  );
};
