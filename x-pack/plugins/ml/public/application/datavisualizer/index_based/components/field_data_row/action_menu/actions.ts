/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Action } from '@elastic/eui/src/components/basic_table/action_types';
import { IndexPattern } from '../../../../../../../../../../src/plugins/data/common/index_patterns/index_patterns';
import { LensPublicStart } from '../../../../../../../../lens/public';
import { FieldVisConfig } from '../../../../stats_table/types';
import { getCompatibleLensDataType, getLensAttributes } from './lens_utils';
import { CombinedQuery } from '../../../common';

export function getActions(
  indexPattern: IndexPattern,
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
        const lensAttributes = getLensAttributes(indexPattern!, combinedQuery, item);
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
