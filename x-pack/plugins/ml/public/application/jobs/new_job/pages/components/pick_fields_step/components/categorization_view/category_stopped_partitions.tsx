/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext, useEffect, useState, useMemo } from 'react';
import { EuiBasicTable, EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { Subscription } from 'rxjs';
import { JobCreatorContext } from '../../../job_creator_context';
import { CategorizationJobCreator } from '../../../../../common/job_creator';
import { Results } from '../../../../../common/results_loader';
import { ml } from '../../../../../../../services/ml_api_service';

const NUMBER_OF_PREVIEW = 5;
export const CategoryStoppedPartitions: FC = () => {
  const { jobCreator: jc, resultsLoader } = useContext(JobCreatorContext);
  const jobCreator = jc as CategorizationJobCreator;
  const [tableRow, setTableRow] = useState<Array<{ partitionName: string }>>([]);
  const [hasStoppedPartitions, setHasStoppedPartitions] = useState(false);

  let _resultsSubscription: undefined | Subscription;

  const columns = useMemo(
    () => [
      {
        field: 'partitionName',
        name: i18n.translate(
          'xpack.ml.newJob.wizard.pickFieldsStep.stoppedPartitionsPreviewColumnName',
          {
            defaultMessage: 'Stopped partition {count, plural, one {name} other {names}}',
            values: { count: tableRow.length },
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
      if (
        stoppedPartitionsPreview.length >= NUMBER_OF_PREVIEW &&
        _resultsSubscription !== undefined
      ) {
        _resultsSubscription.unsubscribe();
        _resultsSubscription = undefined;
      }
      setHasStoppedPartitions(true);
      setTableRow(
        stoppedPartitionsPreview.slice(0, NUMBER_OF_PREVIEW).map((partitionName) => ({
          partitionName,
        }))
      );
    }
  }

  useEffect(() => {
    // only need to run this check if jobCreator.perPartitionStopOnWarn is turned on
    if (jobCreator.perPartitionCategorization && jobCreator.perPartitionStopOnWarn) {
      // subscribe to result updates
      _resultsSubscription = resultsLoader.subscribeToResults(setResultsWrapper);
      return () => {
        if (_resultsSubscription) {
          _resultsSubscription.unsubscribe();
        }
      };
    }
  }, []);

  return (
    <>
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
                defaultMessage="Per-partition categorization and stop_on_warn settings are enabled. Some partitions in job '{jobId}' are unsuitable for categorization and are not included in the categorization or anomaly detection analysis."
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
