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
      i18n.translate('xpack.ml.actions.createADJobFromLens', {
        defaultMessage: 'Create anomaly detection job',
      }),
    async execute({ embeddable }) {
      if (!embeddable) {
        throw new Error('Not possible to execute an action without the embeddable context');
      }

      try {
        const [{ convertLensToADJob }, [coreStart]] = await Promise.all([
          import('../application/jobs/new_job/job_from_lens'),
          getStartServices(),
        ]);

        convertLensToADJob(embeddable, coreStart);
      } catch (e) {
        return Promise.reject();
      }
    },
    async isCompatible(context: { embeddable: Embeddable }) {
      if (context.embeddable.type !== 'lens') {
        return false;
      }

      const [{ getJobsItemsFromEmbeddable, canCreateADJob }, [coreStart, pluginsStart]] =
        await Promise.all([
          import('../application/jobs/new_job/job_from_lens'),
          getStartServices(),
        ]);
      const { query, filters, vis } = getJobsItemsFromEmbeddable(context.embeddable);
      return canCreateADJob(vis, query, filters, pluginsStart.data.dataViews, coreStart.uiSettings);
    },
  });
}
