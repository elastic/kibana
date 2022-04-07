/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { IEmbeddable } from 'src/plugins/embeddable/public';
import { createAction } from '../../../../../src/plugins/ui_actions/public';
// import { ViewMode } from '../../../../../src/plugins/embeddable/public';
// import { MlCoreSetup } from '../plugin';
import {
  // ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE,
  EditAnomalyChartsPanelContext,
} from '../embeddables';

export const CREATE_ML_AD_JOB_ACTION = 'createMLADJobAction';

export function createMLADJobAction() {
  return createAction<EditAnomalyChartsPanelContext>({
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

      // const [coreStart] = await getStartServices();

      try {
        // const { resolveEmbeddableAnomalyChartsUserInput } = await import(
        //   '../embeddables/anomaly_charts/anomaly_charts_setup_flyout'
        // );
        const { convertLensToADJob } = await import(
          '../embeddables/convert_to_jobs/convert_lens_to_job_action'
        );

        convertLensToADJob(embeddable);
        // embeddable.updateInput(result);
      } catch (e) {
        return Promise.reject();
      }
    },
    async isCompatible(context: { embeddable: IEmbeddable }) {
      // return (
      //   embeddable.type === ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE &&
      //   embeddable.getInput().viewMode === ViewMode.EDIT
      // );
      return (
        context.embeddable.type === 'lens' &&
        (await (context.embeddable as any).canViewUnderlyingData())
      );
    },
  });
}
