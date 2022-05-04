/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Embeddable } from '@kbn/lens-plugin/public';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { MlCoreSetup } from '../plugin';

export const CREATE_ML_AD_JOB_ACTION = 'createMLADJobAction';

export function createMLADJobAction(getStartServices: MlCoreSetup['getStartServices']) {
  return createAction<{ embeddable: Embeddable }>({
    id: 'create-ml-ad-job-action',
    type: CREATE_ML_AD_JOB_ACTION,
    getIconType(context): string {
      return 'machineLearningApp';
    },
    getDisplayName: () =>
      i18n.translate('xpack.ml.actions.editAnomalyChartsTitle', {
        defaultMessage: 'Create Anomaly Detection Job',
      }),
    async execute({ embeddable }) {
      if (!embeddable) {
        throw new Error('Not possible to execute an action without the embeddable context');
      }

      try {
        const { convertLensToADJob } = await import('../application/jobs/new_job/job_from_lens');

        convertLensToADJob(embeddable);
      } catch (e) {
        return Promise.reject();
      }
    },
    async isCompatible(context: { embeddable: Embeddable }) {
      const [coreStart, pluginsStart] = await getStartServices();
      const { canCreateADJob, getJobsItemsFromEmbeddable } = await import(
        '../application/jobs/new_job/job_from_lens'
      );
      const { query, filters, vis } = getJobsItemsFromEmbeddable(context.embeddable);
      return (
        context.embeddable.type === 'lens' &&
        (await (context.embeddable as any).canViewUnderlyingData()) &&
        canCreateADJob(vis, query, filters, pluginsStart.data.dataViews, coreStart.uiSettings)
      );
    },
  });
}
