/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react'; // useCallback
import { FormattedMessage } from '@kbn/i18n-react';
import type { Embeddable } from '@kbn/lens-plugin/public';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';

import {
  redirectToADJobWizards,
  QuickLensJobCreator,
} from '../../../../../application/jobs/new_job/job_from_lens';
import type { LayerResult } from '../../../../../application/jobs/new_job/job_from_lens';
import { JOB_TYPE } from '../../../../../../common/constants/new_job';
import { useMlFromLensKibanaContext } from '../../context';
import { JobDetails, CreateADJobParams } from '../../../common/job_details';

interface Props {
  layer: LayerResult;
  layerIndex: number;
  embeddable: Embeddable;
}

export const CompatibleLayer: FC<Props> = ({ layer, layerIndex, embeddable }) => {
  const {
    services: {
      data,
      share,
      uiSettings,
      mlServices: { mlApiServices },
      lens,
    },
  } = useMlFromLensKibanaContext();

  const quickJobCreator = useMemo(
    () =>
      new QuickLensJobCreator(
        lens,
        uiSettings,
        data.query.timefilter.timefilter,
        share,
        mlApiServices
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, uiSettings]
  );

  function createADJobInWizard() {
    redirectToADJobWizards(embeddable, layerIndex, share, lens);
  }

  async function createADJob({
    jobId,
    bucketSpan,
    embeddable: lensEmbeddable,
    startJob,
    runInRealTime,
  }: CreateADJobParams) {
    const result = await quickJobCreator.createAndSaveJob(
      jobId,
      bucketSpan,
      lensEmbeddable as Embeddable,
      startJob,
      runInRealTime,
      layerIndex
    );
    return result;
  }

  return (
    <>
      <JobDetails
        createADJob={createADJob}
        createADJobInWizard={createADJobInWizard}
        embeddable={embeddable}
        layer={layer}
        layerIndex={layerIndex}
      >
        <EuiFlexGroup gutterSize="s" data-test-subj="mlLensLayerCompatible">
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
        </EuiFlexGroup>
      </JobDetails>
    </>
  );
};
