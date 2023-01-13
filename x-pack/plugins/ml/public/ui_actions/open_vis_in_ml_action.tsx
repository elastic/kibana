/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Embeddable } from '@kbn/lens-plugin/public';
import type { MapEmbeddable } from '@kbn/maps-plugin/public';
import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import { MlCoreSetup } from '../plugin';
import { isLensEmbeddable, isMapEmbeddable } from '../application/jobs/new_job/job_from_dashboard';

export const CREATE_LENS_VIS_TO_ML_AD_JOB_ACTION = 'createMLADJobAction';

export function createVisToADJobAction(
  getStartServices: MlCoreSetup['getStartServices']
): UiActionsActionDefinition<{ embeddable: Embeddable | MapEmbeddable }> {
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
        if (isLensEmbeddable(embeddable)) {
          const [{ showLensVisToADJobFlyout }, [coreStart, { share, data, lens }]] =
            await Promise.all([import('../embeddables/job_creation/lens'), getStartServices()]);
          if (lens === undefined) {
            return;
          }
          await showLensVisToADJobFlyout(embeddable, coreStart, share, data, lens);
        } else if (isMapEmbeddable(embeddable)) {
          const [{ showMapVisToADJobFlyout }, [coreStart, { share, data }]] = await Promise.all([
            import('../embeddables/job_creation/map'),
            getStartServices(),
          ]);
          await showMapVisToADJobFlyout(embeddable, coreStart, share, data);
        }
      } catch (e) {
        return Promise.reject();
      }
    },
    async isCompatible(context: { embeddable: Embeddable }) {
      const embeddableType = context.embeddable.type;
      if (embeddableType !== 'map') {
        if (embeddableType !== 'lens' || !context.embeddable.getSavedVis()) {
          return false;
        }
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
        if (embeddableType === 'lens' && lens) {
          const { chartInfo } = await getJobsItemsFromEmbeddable(context.embeddable, lens);
          return isCompatibleVisualizationType(chartInfo!);
        }
        return true;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error attempting to check for ML job compatibility', error);
        return false;
      }
    },
  };
}
