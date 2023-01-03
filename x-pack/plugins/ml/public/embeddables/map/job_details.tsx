/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import type { MapEmbeddable } from '@kbn/maps-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';

import { QuickJobCreator } from '../../application/jobs/new_job/job_from_map';
import { redirectToGeoJobWizard } from '../../application/jobs/new_job/job_from_map';
import { useMlFromLensKibanaContext } from '../lens/context';
import { MlJobAdditionalSettings } from '../common/ml_job_additional_settings';

interface Props {
  embeddable: MapEmbeddable;
  sourceDataView: DataView;
  geoField: string;
  splitField: string | null;
  layerIndex: number;
}

export const JobDetails: FC<Props> = ({
  embeddable,
  sourceDataView,
  geoField,
  splitField,
  layerIndex,
}) => {
  const {
    services: {
      data,
      share,
      uiSettings,
      mlServices: { mlApiServices },
    },
  } = useMlFromLensKibanaContext();

  const quickJobCreator = useMemo(
    () => new QuickJobCreator(uiSettings, data.query.timefilter.timefilter, share, mlApiServices),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, uiSettings]
  );

  function createGeoJobInWizard() {
    redirectToGeoJobWizard(embeddable, sourceDataView.id!, geoField, splitField, share);
  }

  async function createADJob({
    jobId,
    bucketSpan,
    embeddable: mapEmbeddable,
    startJob,
    runInRealTime,
  }: {
    jobId: string;
    bucketSpan: string;
    embeddable: MapEmbeddable;
    startJob: boolean;
    runInRealTime: boolean;
  }) {
    const result = await quickJobCreator.createAndSaveGeoJob({
      jobId,
      bucketSpan,
      embeddable: mapEmbeddable,
      startJob,
      runInRealTime,
      sourceDataView,
      geoField,
      splitField,
    });

    return result;
  }

  return (
    <>
      <MlJobAdditionalSettings
        createADJob={createADJob}
        createADJobInWizard={createGeoJobInWizard}
        embeddable={embeddable}
      />
    </>
  );
};
