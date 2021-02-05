/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Action } from '@elastic/eui/src/components/basic_table/action_types';
import { getCompatibleLensDataType, getLensAttributes } from './lens_utils';
import type { CombinedQuery } from '../../../common';
import type { IIndexPattern } from '../../../../../../../../../../src/plugins/data/common/index_patterns';
import type { LensPublicStart } from '../../../../../../../../lens/public';
import type { FieldVisConfig } from '../../../../stats_table/types';

export function getActions(
  indexPattern: IIndexPattern,
  lensPlugin: LensPublicStart,
  combinedQuery: CombinedQuery
): Array<Action<FieldVisConfig>> {
  const canUseLensEditor = lensPlugin.canUseEditor();
  return [
    {
      name: i18n.translate('xpack.ml.dataVisualizer.indexBasedDataGrid.exploreInLensTitle', {
        defaultMessage: 'Explore in Lens',
      }),
      description: i18n.translate(
        'xpack.ml.dataVisualizer.indexBasedDataGrid.exploreInLensDescription',
        {
          defaultMessage: 'Explore in Lens',
        }
      ),
      type: 'icon',
      icon: 'lensApp',
      available: (item: FieldVisConfig) =>
        getCompatibleLensDataType(item.type) !== undefined && canUseLensEditor,
      onClick: (item: FieldVisConfig) => {
        const lensAttributes = getLensAttributes(indexPattern, combinedQuery, item);
        if (lensAttributes) {
          lensPlugin.navigateToPrefilledEditor({
            id: `ml-dataVisualizer-${item.fieldName}`,
            attributes: lensAttributes,
          });
        }
      },
      'data-test-subj': 'mlActionButtonViewInLens',
    },
  ];
}
