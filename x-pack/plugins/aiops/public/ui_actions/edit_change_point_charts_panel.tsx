/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import { i18n } from '@kbn/i18n';
import { ViewMode } from '@kbn/embeddable-plugin/common';
import { EMBEDDABLE_CHANGE_POINT_CHART_TYPE } from '../../common/constants';
import type { EditChangePointChartsPanelContext } from '../embeddable/types';
import type { AiopsCoreSetup } from '../plugin';

export const EDIT_CHANGE_POINT_CHARTS_ACTION = 'editChangePointChartsPanelAction';

export function createEditChangePointChartsPanelAction(
  getStartServices: AiopsCoreSetup['getStartServices']
): UiActionsActionDefinition<EditChangePointChartsPanelContext> {
  return {
    id: 'edit-change-point-charts',
    type: EDIT_CHANGE_POINT_CHARTS_ACTION,
    getIconType(context): string {
      return 'pencil';
    },
    getDisplayName: () =>
      i18n.translate('xpack.aiops.actions.editChangePointChartsName', {
        defaultMessage: 'Edit change point charts',
      }),
    async execute({ embeddable }) {
      if (!embeddable) {
        throw new Error('Not possible to execute an action without the embeddable context');
      }

      const [coreStart, pluginStart] = await getStartServices();

      try {
        const { resolveEmbeddableChangePointUserInput } = await import(
          '../embeddable/handle_explicit_input'
        );

        const result = await resolveEmbeddableChangePointUserInput(
          coreStart,
          pluginStart,
          embeddable.getInput()
        );
        embeddable.updateInput(result);
      } catch (e) {
        return Promise.reject();
      }
    },
    async isCompatible({ embeddable }) {
      return (
        embeddable.type === EMBEDDABLE_CHANGE_POINT_CHART_TYPE &&
        embeddable.getInput().viewMode === ViewMode.EDIT
      );
    },
  };
}
