/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Embeddable } from '@kbn/lens-plugin/public';
import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import { MlCoreSetup } from '../plugin';

export const CREATE_LENS_VIS_TO_ML_AD_JOB_ACTION = 'createMLADJobAction';

export function createLensVisToADJobAction(
  getStartServices: MlCoreSetup['getStartServices']
): UiActionsActionDefinition<{ embeddable: Embeddable }> {
  return {
    id: 'create-ml-ad-job-action',
    type: CREATE_LENS_VIS_TO_ML_AD_JOB_ACTION,
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
        const [{ showLensVisToADJobFlyout }, [coreStart, { share, data, lens }]] =
          await Promise.all([import('../embeddables/lens'), getStartServices()]);
        if (lens === undefined) {
          return;
        }
        await showLensVisToADJobFlyout(embeddable, coreStart, share, data, lens);
      } catch (e) {
        return Promise.reject();
      }
    },
    async isCompatible(context: { embeddable: Embeddable }) {
      if (context.embeddable.type !== 'lens' || !context.embeddable.getSavedVis()) {
        return false;
      }

      const [{ getJobsItemsFromEmbeddable, isCompatibleVisualizationType }, [coreStart, { lens }]] =
        await Promise.all([
          import('../application/jobs/new_job/job_from_lens'),
          getStartServices(),
        ]);

      if (
        !coreStart.application.capabilities.ml?.canCreateJob ||
        !coreStart.application.capabilities.ml?.canStartStopDatafeed
      ) {
        return false;
      }

      try {
        const { chartInfo } = await getJobsItemsFromEmbeddable(context.embeddable, lens);
        return isCompatibleVisualizationType(chartInfo);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error attempting to check for ML job compatibility', error);
        return false;
      }
    },
  };
}
