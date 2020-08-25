/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { EuiBasicTable, EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { Subscription } from 'rxjs';
import { JobCreatorContext } from '../../../job_creator_context';
import { CategorizationJobCreator } from '../../../../../common/job_creator';
import { Results } from '../../../../../common/results_loader';
import { ml } from '../../../../../../../services/ml_api_service';
import { extractErrorProperties } from '../../../../../../../../../common/util/errors';

const NUMBER_OF_PREVIEW = 5;
export const CategoryStoppedPartitions: FC = () => {
  const { jobCreator: jc, resultsLoader } = useContext(JobCreatorContext);
  const jobCreator = jc as CategorizationJobCreator;
  const [tableRow, setTableRow] = useState<Array<{ partitionName: string }>>([]);
  const [hasStoppedPartitions, setHasStoppedPartitions] = useState(false);
  const [stoppedPartitionsError, setStoppedPartitionsError] = useState<string | undefined>();

  // using ref so this Subscription instance is only intialized once
  const _resultsSubscription: undefined | Subscription = useRef();

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
  function setResultsWrapper(results: Results) {
    loadCategoryStoppedPartitions();
  }

  async function loadCategoryStoppedPartitions() {
    try {
      const results = await ml.results.getCategoryStoppedPartitions([jobCreator.jobId]);

      if (
        results?.jobs !== undefined &&
        !Array.isArray(results?.jobs) && // if jobs is object of jobId: [partitions]
        Array.isArray(results?.jobs[jobCreator.jobId]) &&
        results.jobs[jobCreator.jobId].length > 0
      ) {
        const stoppedPartitionsPreview = results.jobs[jobCreator.jobId];
        // once we have reached number of stopped partitions we wanted to show as preview
        // no need to keep fetching anymore
        if (stoppedPartitionsPreview.length >= NUMBER_OF_PREVIEW && !_resultsSubscription.current) {
          _resultsSubscription.current.unsubscribe();
          _resultsSubscription.current = undefined;
        }
        setHasStoppedPartitions(true);
        setTableRow(
          stoppedPartitionsPreview.slice(0, NUMBER_OF_PREVIEW).map((partitionName) => ({
            partitionName,
          }))
        );
      }
    } catch (e) {
      const error = extractErrorProperties(e);
      // might get 404 because job has not been created yet and that's ok
      if (error.statusCode !== 404) {
        setStoppedPartitionsError(error.message);
      }
    }
  }

  useEffect(() => {
    // only need to run this check if jobCreator.perPartitionStopOnWarn is turned on
    if (jobCreator.perPartitionCategorization && jobCreator.perPartitionStopOnWarn) {
      // subscribe to result updates
      _resultsSubscription.current = resultsLoader.subscribeToResults(setResultsWrapper);
      return () => {
        if (_resultsSubscription.current) {
          _resultsSubscription.current.unsubscribe();
        }
      };
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
      {hasStoppedPartitions && (
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
