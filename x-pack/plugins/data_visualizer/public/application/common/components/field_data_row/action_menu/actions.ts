/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Action } from '@elastic/eui/src/components/basic_table/action_types';
import { MutableRefObject } from 'react';
import { DataView } from '@kbn/data-views-plugin/public';
import { VISUALIZE_GEO_FIELD_TRIGGER } from '@kbn/ui-actions-plugin/public';
import { getCompatibleLensDataType, getLensAttributes } from './lens_utils';
import { CombinedQuery } from '../../../../index_data_visualizer/types/combined_query';
import { FieldVisConfig } from '../../stats_table/types';
import { DataVisualizerKibanaReactContextValue } from '../../../../kibana_context';
import {
  dataVisualizerRefresh$,
  Refresh,
} from '../../../../index_data_visualizer/services/timefilter_refresh_service';
import { JOB_FIELD_TYPES } from '../../../../../../common/constants';
import { APP_ID } from '../../../../../../common/constants';

export function getActions(
  dataView: DataView,
  services: Partial<DataVisualizerKibanaReactContextValue['services']>,
  combinedQuery: CombinedQuery,
  dataViewEditorRef: MutableRefObject<(() => void | undefined) | undefined> | undefined
): Array<Action<FieldVisConfig>> {
  const { lens: lensPlugin, maps: mapsPlugin, data } = services;

  const actions: Array<Action<FieldVisConfig>> = [];
  const filters = data?.query.filterManager.getFilters() ?? [];

  const refreshPage = () => {
    const refresh: Refresh = {
      lastRefresh: Date.now(),
    };
    dataVisualizerRefresh$.next(refresh);
  };
  // Navigate to Lens with prefilled chart for data field
  if (services.application?.capabilities?.visualize?.show === true && lensPlugin !== undefined) {
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
      available: (item: FieldVisConfig) =>
        getCompatibleLensDataType(item.type) !== undefined && canUseLensEditor,
      onClick: (item: FieldVisConfig) => {
        const lensAttributes = getLensAttributes(dataView, combinedQuery, filters, item);
        if (lensAttributes) {
          lensPlugin.navigateToPrefilledEditor({
            id: `dataVisualizer-${item.fieldName}`,
            attributes: lensAttributes,
          });
        }
      },
      'data-test-subj': 'dataVisualizerActionViewInLensButton',
    });
  }

  if (
    services?.uiActions &&
    mapsPlugin &&
    services.application?.capabilities?.maps?.show === true
  ) {
    actions.push({
      name: i18n.translate('xpack.dataVisualizer.index.dataGrid.exploreInMapsTitle', {
        defaultMessage: 'Explore in Maps',
      }),
      description: i18n.translate('xpack.dataVisualizer.index.dataGrid.exploreInMapsDescription', {
        defaultMessage: 'Explore in Maps',
      }),
      type: 'icon',
      icon: 'gisApp',
      available: (item: FieldVisConfig) => {
        return item.type === JOB_FIELD_TYPES.GEO_POINT || item.type === JOB_FIELD_TYPES.GEO_SHAPE;
      },
      onClick: async (item: FieldVisConfig) => {
        if (services?.uiActions && dataView) {
          const triggerOptions = {
            indexPatternId: dataView.id,
            fieldName: item.fieldName,
            contextualFields: [],
            originatingApp: APP_ID,
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

  if (dataViewEditorRef !== undefined) {
    // Allow to edit data view field
    if (services.dataViewFieldEditor?.userPermissions.editIndexPattern()) {
      actions.push({
        name: i18n.translate('xpack.dataVisualizer.index.dataGrid.editDataViewFieldTitle', {
          defaultMessage: 'Edit data view field',
        }),
        description: i18n.translate(
          'xpack.dataVisualizer.index.dataGrid.editDataViewFieldDescription',
          {
            defaultMessage: 'Edit data view field',
          }
        ),
        type: 'icon',
        icon: 'indexEdit',
        onClick: (item: FieldVisConfig) => {
          dataViewEditorRef.current = services.dataViewFieldEditor?.openEditor({
            ctx: { dataView },
            fieldName: item.fieldName,
            onSave: refreshPage,
          });
        },
        'data-test-subj': 'dataVisualizerActionEditIndexPatternFieldButton',
      });
      actions.push({
        name: i18n.translate('xpack.dataVisualizer.index.dataGrid.deleteDataViewFieldTitle', {
          defaultMessage: 'Delete data view field',
        }),
        description: i18n.translate(
          'xpack.dataVisualizer.index.dataGrid.deleteIndexPatternFieldDescription',
          {
            defaultMessage: 'Delete data view field',
          }
        ),
        type: 'icon',
        icon: 'trash',
        available: (item: FieldVisConfig) => {
          return item.deletable === true;
        },
        onClick: (item: FieldVisConfig) => {
          dataViewEditorRef.current = services.dataViewFieldEditor?.openDeleteModal({
            ctx: { dataView },
            fieldName: item.fieldName!,
            onDelete: refreshPage,
          });
        },
        'data-test-subj': 'dataVisualizerActionDeleteIndexPatternFieldButton',
      });
    }
  }
  return actions;
}
