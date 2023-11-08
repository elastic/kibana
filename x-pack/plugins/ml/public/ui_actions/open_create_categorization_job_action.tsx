/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Trigger, UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import {
  CREATE_PATTERN_ANALYSIS_TO_ML_AD_JOB_ACTION,
  CREATE_PATTERN_ANALYSIS_TO_ML_AD_JOB_TRIGGER,
  type CreateCategorizationADJobContext,
} from '@kbn/ml-ui-actions';
import type { MlCoreSetup } from '../plugin';

export const createCategorizationADJobTrigger: Trigger = {
  id: CREATE_PATTERN_ANALYSIS_TO_ML_AD_JOB_TRIGGER,
  title: 'Create categorization anomaly detection job',
  description: 'Triggered when user wants to run pattern analysis on a field.',
};

export function createCategorizationADJobAction(
  getStartServices: MlCoreSetup['getStartServices']
): UiActionsActionDefinition<CreateCategorizationADJobContext> {
  return {
    id: 'create-ml-categorization-ad-job-action',
    type: CREATE_PATTERN_ANALYSIS_TO_ML_AD_JOB_ACTION,
    getIconType(context): string {
      return 'machineLearningApp';
    },
    getDisplayName: () =>
      i18n.translate('xpack.ml.actions.createADJobFromLens', {
        defaultMessage: 'Create categorization anomaly detection job',
      }),
    async execute({ dataView, field, query, timeRange }: CreateCategorizationADJobContext) {
      if (!dataView) {
        throw new Error('Not possible to execute an action without the embeddable context');
      }

      try {
        const [
          { showPatternAnalysisToADJobFlyout },
          [coreStart, { share, data, lens, dashboard }],
        ] = await Promise.all([import('../embeddables/job_creation/aiops'), getStartServices()]);
        if (lens === undefined) {
          return;
        }
        await showPatternAnalysisToADJobFlyout(
          dataView,
          field,
          query,
          timeRange,
          coreStart,
          share,
          data,
          lens,
          dashboard
        );
      } catch (e) {
        return Promise.reject();
      }
    },
    // async isCompatible(context: { embeddable: Embeddable }) {
    //   const embeddableType = context.embeddable.type;
    //   if (embeddableType !== 'map') {
    //     if (embeddableType !== 'lens' || !context.embeddable.getSavedVis()) {
    //       return false;
    //     }
    //   }

    //   const [{ getJobsItemsFromEmbeddable, isCompatibleVisualizationType }, [coreStart, { lens }]] =
    //     await Promise.all([
    //       import('../application/jobs/new_job/job_from_lens'),
    //       getStartServices(),
    //     ]);
    //   const { isCompatibleMapVisualization } = await import(
    //     '../application/jobs/new_job/job_from_map'
    //   );

    //   if (
    //     !coreStart.application.capabilities.ml?.canCreateJob ||
    //     !coreStart.application.capabilities.ml?.canStartStopDatafeed
    //   ) {
    //     return false;
    //   }

    //   try {
    //     if (embeddableType === 'lens' && lens) {
    //       const { chartInfo } = await getJobsItemsFromEmbeddable(context.embeddable, lens);
    //       return isCompatibleVisualizationType(chartInfo!);
    //     } else if (isMapEmbeddable(context.embeddable)) {
    //       return isCompatibleMapVisualization(context.embeddable);
    //     }
    //     return true;
    //   } catch (error) {
    //     // eslint-disable-next-line no-console
    //     console.error('Error attempting to check for ML job compatibility', error);
    //     return false;
    //   }
    // },
  };
}
