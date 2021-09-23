/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Action } from '@elastic/eui/src/components/basic_table/action_types';
import { MutableRefObject } from 'react';
import { getCompatibleLensDataType } from './lens_utils';
import { DataView } from '../../../../../../../../../src/plugins/data/common';
import { CombinedQuery } from '../../../../index_data_visualizer/types/combined_query';
import { FieldVisConfig } from '../../stats_table/types';
import { DataVisualizerKibanaReactContextValue } from '../../../../kibana_context';
import {
  dataVisualizerRefresh$,
  Refresh,
} from '../../../../index_data_visualizer/services/timefilter_refresh_service';
import {
  VISUALIZE_FIELD_TRIGGER,
  VISUALIZE_GEO_FIELD_TRIGGER,
} from '../../../../../../../../../src/plugins/ui_actions/public';
import { JOB_FIELD_TYPES } from '../../../../../../common';

export function getActions(
  indexPattern: DataView,
  services: Partial<DataVisualizerKibanaReactContextValue['services']>,
  combinedQuery: CombinedQuery,
  actionFlyoutRef: MutableRefObject<(() => void | undefined) | undefined>
): Array<Action<FieldVisConfig>> {
  const { lens: lensPlugin, maps: mapsPlugin } = services;

  const actions: Array<Action<FieldVisConfig>> = [];

  const refreshPage = () => {
    const refresh: Refresh = {
      lastRefresh: Date.now(),
    };
    dataVisualizerRefresh$.next(refresh);
  };

  if (mapsPlugin) {
    actions.push({
      name: i18n.translate('xpack.dataVisualizer.index.dataGrid.exploreInMapsTitle', {
        defaultMessage: 'Explore in Maps',
      }),
      description: i18n.translate('xpack.dataVisualizer.index.dataGrid.exploreInMapsDescription', {
        defaultMessage: 'Explore in Maps',
      }),
      type: 'icon',
      icon: 'logoMaps',
      available: (item: FieldVisConfig) => {
        return item.type === JOB_FIELD_TYPES.GEO_POINT || item.type === JOB_FIELD_TYPES.GEO_SHAPE;
      },
      onClick: async (item: FieldVisConfig) => {
        if (services?.uiActions && indexPattern) {
          const triggerOptions = {
            indexPatternId: indexPattern.id,
            fieldName: item.fieldName,
            contextualFields: [],
          };
          const testActions = await services?.uiActions.getTriggerCompatibleActions(
            VISUALIZE_GEO_FIELD_TRIGGER,
            triggerOptions
          );

          if (testActions.length > 0 && testActions[0] !== undefined) {
            services?.uiActions.getTrigger(VISUALIZE_GEO_FIELD_TRIGGER).exec(triggerOptions);
          }
        }
      },
      'data-test-subj': 'dataVisualizerActionViewInMapsButton',
    });
  }
  // Navigate to Lens with prefilled chart for data field
  if (lensPlugin !== undefined) {
    const canUseLensEditor = lensPlugin?.canUseEditor();
    actions.push({
      name: i18n.translate('xpack.dataVisualizer.index.dataGrid.exploreInLensTitle', {
        defaultMessage: 'Explore in Lens',
      }),
      description: i18n.translate('xpack.dataVisualizer.index.dataGrid.exploreInLensDescription', {
        defaultMessage: 'Explore in Lens',
      }),
      type: 'icon',
      icon: 'lensApp',
      /**
       * We are not using getTriggerCompatibleActions here
       * because it will make text fields available, but Lens will be empty
       */
      available: (item: FieldVisConfig) =>
        getCompatibleLensDataType(item.type) !== undefined && canUseLensEditor,
      onClick: async (item: FieldVisConfig) => {
        if (services?.uiActions && indexPattern) {
          const triggerOptions = {
            indexPatternId: indexPattern.id,
            fieldName: item.fieldName,
            contextualFields: [],
            query: {
              query: combinedQuery.searchString,
              language: combinedQuery.searchQueryLanguage,
            },
          };
          const testActions = await services?.uiActions.getTriggerCompatibleActions(
            VISUALIZE_FIELD_TRIGGER,
            triggerOptions
          );

          if (testActions.length > 0 && testActions[0] !== undefined) {
            services?.uiActions.getTrigger(VISUALIZE_FIELD_TRIGGER).exec(triggerOptions);
          }
        }
      },
      'data-test-subj': 'dataVisualizerActionViewInLensButton',
    });
  }

  // Allow to edit index pattern field
  if (services.indexPatternFieldEditor?.userPermissions.editIndexPattern()) {
    actions.push({
      name: i18n.translate('xpack.dataVisualizer.index.dataGrid.editIndexPatternFieldTitle', {
        defaultMessage: 'Edit index pattern field',
      }),
      description: i18n.translate(
        'xpack.dataVisualizer.index.dataGrid.editIndexPatternFieldDescription',
        {
          defaultMessage: 'Edit index pattern field',
        }
      ),
      type: 'icon',
      icon: 'indexEdit',
      onClick: (item: FieldVisConfig) => {
        actionFlyoutRef.current = services.indexPatternFieldEditor?.openEditor({
          ctx: { indexPattern },
          fieldName: item.fieldName,
          onSave: refreshPage,
        });
      },
      'data-test-subj': 'dataVisualizerActionEditIndexPatternFieldButton',
    });
    actions.push({
      name: i18n.translate('xpack.dataVisualizer.index.dataGrid.deleteIndexPatternFieldTitle', {
        defaultMessage: 'Delete index pattern field',
      }),
      description: i18n.translate(
        'xpack.dataVisualizer.index.dataGrid.deleteIndexPatternFieldDescription',
        {
          defaultMessage: 'Delete index pattern field',
        }
      ),
      type: 'icon',
      icon: 'trash',
      available: (item: FieldVisConfig) => {
        return item.deletable === true;
      },
      onClick: (item: FieldVisConfig) => {
        actionFlyoutRef.current = services.indexPatternFieldEditor?.openDeleteModal({
          ctx: { indexPattern },
          fieldName: item.fieldName!,
          onDelete: refreshPage,
        });
      },
      'data-test-subj': 'dataVisualizerActionDeleteIndexPatternFieldButton',
    });
  }
  return actions;
}
