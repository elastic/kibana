/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo, useState } from 'react'; // useCallback
import { FormattedMessage } from '@kbn/i18n-react';
import type { Embeddable } from '@kbn/lens-plugin/public';

import { EuiCheckableCard, EuiTitle, EuiSpacer } from '@elastic/eui';

import { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import type { TimeRange } from '@kbn/es-query';
// import type { Embeddable } from '@kbn/lens-plugin/public';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  CategorizationType,
  CATEGORIZATION_TYPE,
  QuickCategorizationJobCreator,
} from '../../../../application/jobs/new_job/job_from_dashboard/quick_create_categorization_job';
// import type { LayerResult } from '../../../../application/jobs/new_job/job_from_lens';
import { useMlFromLensKibanaContext } from '../../common/context';
import { JobDetails, CreateADJobParams } from '../../common/job_details';

interface Props {
  dataView: DataView;
  field: DataViewField;
  query: QueryDslQueryContainer;
  timeRange: TimeRange;
}

export const CreateJob: FC<Props> = ({ dataView, field, query, timeRange }) => {
  const {
    services: {
      data,
      share,
      uiSettings,
      mlServices: { mlApiServices },
      lens,
      dashboardService,
    },
  } = useMlFromLensKibanaContext();

  // console.log('dataView', dataView);
  // console.log('field', field);
  // console.log('query', query);
  // console.log('timeRange', timeRange);

  const [categorizationType, setCategorizationType] = useState<CategorizationType>(
    CATEGORIZATION_TYPE.COUNT
  );

  const quickJobCreator = useMemo(
    () =>
      new QuickCategorizationJobCreator(
        uiSettings,
        data.query.timefilter.timefilter,
        dashboardService,
        mlApiServices
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, uiSettings]
  );

  function createADJobInWizard() {
    // redirectToADJobWizards(embeddable, layerIndex, share, lens);
  }

  async function createADJob({
    jobId,
    bucketSpan,
    embeddable: lensEmbeddable,
    startJob,
    runInRealTime,
  }: CreateADJobParams) {
    const result = await quickJobCreator.createAndSaveJob(
      categorizationType,
      jobId,
      bucketSpan,
      dataView,
      field,
      query,
      timeRange,
      startJob,
      runInRealTime,
      0
    );
    return result;
  }

  const embeddable: Embeddable = {
    getInput: () => ({
      from: '',
      to: '',
    }),
  } as unknown as Embeddable;

  return (
    <>
      <JobDetails
        createADJob={createADJob}
        createADJobInWizard={createADJobInWizard}
        embeddable={embeddable}
        layer={undefined}
        layerIndex={0}
      >
        <>
          <EuiCheckableCard
            id={'count'}
            label={
              <>
                <EuiTitle size="xs">
                  <h5>
                    <FormattedMessage defaultMessage="Count" id="xpack.ml.newJob.changeMe" />
                  </h5>
                </EuiTitle>
                <EuiSpacer size="s" />
                <FormattedMessage
                  defaultMessage="Look for anomalies in the event rate of a category."
                  id="xpack.ml.newJob.changeMe"
                />
              </>
            }
            checked={categorizationType === CATEGORIZATION_TYPE.COUNT}
            onChange={() => setCategorizationType(CATEGORIZATION_TYPE.COUNT)}
          />
          <EuiSpacer size="s" />
          <EuiCheckableCard
            id={'rare'}
            label={
              <>
                <EuiTitle size="xs">
                  <h5>
                    <FormattedMessage defaultMessage="Rare" id="xpack.ml.newJob.changeMe" />
                  </h5>
                </EuiTitle>
                <EuiSpacer size="s" />
                <FormattedMessage
                  defaultMessage="Look for categories that occur rarely in time."
                  id="xpack.ml.newJob.changeMe"
                />
              </>
            }
            checked={categorizationType === CATEGORIZATION_TYPE.RARE}
            onChange={() => setCategorizationType(CATEGORIZATION_TYPE.RARE)}
          />

          {/* <CountCard
            onClick={() => setCategorizationType(CATEGORIZATION_TYPE.COUNT)}
            isSelected={categorizationType === CATEGORIZATION_TYPE.COUNT}
          />
          <RareCard
            onClick={() => setCategorizationType(CATEGORIZATION_TYPE.RARE)}
            isSelected={categorizationType === CATEGORIZATION_TYPE.RARE}
          /> */}
        </>
        {/* <EuiFlexGroup gutterSize="s" data-test-subj="mlLensLayerCompatible">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <EuiIcon type="checkInCircleFilled" color="success" />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              {layer.jobType === JOB_TYPE.MULTI_METRIC ? (
                <FormattedMessage
                  id="xpack.ml.embeddables.lensLayerFlyout.createJobCalloutTitle.multiMetric"
                  defaultMessage="This layer can be used to create a multi-metric job"
                />
              ) : (
                <FormattedMessage
                  id="xpack.ml.embeddables.lensLayerFlyout.createJobCalloutTitle.singleMetric"
                  defaultMessage="This layer can be used to create a single metric job"
                />
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup> */}
      </JobDetails>
    </>
  );
};
