/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  type EmbeddableApiContext,
  type HasType,
  type HasParentApi,
  type PublishesLocalUnifiedSearch,
  apiHasType
} from '@kbn/presentation-publishing';
import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import { type HasLensConfig, apiHasLensConfig } from '@kbn/lens-plugin/public';
import { type HasMapConfig, apiHasMapConfig } from '@kbn/maps-plugin/public';
import { MlCoreSetup } from '../plugin';
import { isLensEmbeddable, isMapEmbeddable } from '../application/jobs/new_job/job_from_dashboard';

export const CREATE_LENS_VIS_TO_ML_AD_JOB_ACTION = 'createMLADJobAction';

export type ActionApi = HasType<'lens' | 'map'> &
  Partial<(HasLensConfig | HasMapConfig) & PublishesLocalUnifiedSearch & HasParentApi<Partial<HasType & PublishesLocalUnifiedSearch>>>;

export const isApiCompatible = (api: unknown | null): api is ActionApi =>
  Boolean(apiHasType(api));

export function createVisToADJobAction(
  getStartServices: MlCoreSetup['getStartServices']
): UiActionsActionDefinition<EmbeddableApiContext> {
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
    async execute({ embeddable }: EmbeddableApiContext) {
      if (!embeddable) {
        throw new Error('Not possible to execute an action without the embeddable context');
      }

      try {
        if (isLensEmbeddable(embeddable)) {
          const [{ showLensVisToADJobFlyout }, [coreStart, { share, data, lens, dashboard }]] =
            await Promise.all([import('../embeddables/job_creation/lens'), getStartServices()]);
          if (lens === undefined) {
            return;
          }
          await showLensVisToADJobFlyout(embeddable, coreStart, share, data, dashboard, lens);
        } else if (isMapEmbeddable(embeddable)) {
          const [{ showMapVisToADJobFlyout }, [coreStart, { share, data, dashboard }]] =
            await Promise.all([import('../embeddables/job_creation/map'), getStartServices()]);
          await showMapVisToADJobFlyout(embeddable, coreStart, share, data, dashboard);
        }
      } catch (e) {
        return Promise.reject();
      }
    },
    async isCompatible({ embeddable }: EmbeddableApiContext) {
      if (!isApiCompatible(embeddable) || !['map', 'lens'].includes(embeddable.type)) return false;

      const [{ getChartInfoFromVisualization, isCompatibleVisualizationType }, [coreStart, { lens }]] =
        await Promise.all([
          import('../application/jobs/new_job/job_from_lens'),
          getStartServices(),
        ]);
      const { isCompatibleMapVisualization } = await import(
        '../application/jobs/new_job/job_from_map'
      );
      
      if (
        !coreStart.application.capabilities.ml?.canCreateJob ||
        !coreStart.application.capabilities.ml?.canStartStopDatafeed
      ) {
        return false;
      }

      try {
        if (apiHasLensConfig(embeddable) && lens) {
          const chartInfo = await getChartInfoFromVisualization(lens, embeddable.getSavedVis());
          return isCompatibleVisualizationType(chartInfo);
        } else if (apiHasMapConfig(embeddable)) {
          return isCompatibleMapVisualization(embeddable);
        }
        return false;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error attempting to check for ML job compatibility', error);
        return false;
      }
    },
  };
}
