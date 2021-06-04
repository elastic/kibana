/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Action } from '@elastic/eui/src/components/basic_table/action_types';
import { MutableRefObject } from 'react';
import { getCompatibleLensDataType, getLensAttributes } from './lens_utils';
import { IndexPattern } from '../../../../../../../../../src/plugins/data/common/index_patterns/index_patterns';
import { CombinedQuery } from '../../../../index_data_visualizer/types/combined_query';
import { FieldVisConfig } from '../../stats_table/types';
import { DataVisualizerKibanaReactContextValue } from '../../../../kibana_context';
import {
  dataVisualizerRefresh$,
  Refresh,
} from '../../../../index_data_visualizer/services/timefilter_refresh_service';

export function getActions(
  indexPattern: IndexPattern,
  services: DataVisualizerKibanaReactContextValue['services'],
  combinedQuery: CombinedQuery,
  actionFlyoutRef: MutableRefObject<(() => void | undefined) | undefined>
): Array<Action<FieldVisConfig>> {
  const { lens: lensPlugin, indexPatternFieldEditor } = services;

  const actions: Array<Action<FieldVisConfig>> = [];

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
      available: (item: FieldVisConfig) =>
        getCompatibleLensDataType(item.type) !== undefined && canUseLensEditor,
      onClick: (item: FieldVisConfig) => {
        const lensAttributes = getLensAttributes(indexPattern, combinedQuery, item);
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

  // Allow to edit index pattern field
  if (indexPatternFieldEditor?.userPermissions.editIndexPattern()) {
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
        actionFlyoutRef.current = indexPatternFieldEditor?.openEditor({
          ctx: { indexPattern },
          fieldName: item.fieldName,
          onSave: () => {
            const refresh: Refresh = {
              lastRefresh: Date.now(),
            };
            dataVisualizerRefresh$.next(refresh);
          },
        });
      },
      'data-test-subj': 'dataVisualizerActionEditIndexPatternFieldButton',
    });
  }
  return actions;
}
