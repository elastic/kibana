/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { render } from 'react-dom';
import type { LayerAction, StateSetter } from '../../../../types';
import { XYAnnotationLayerConfig, XYState } from '../../types';
import { EditDetailsFlyout } from './edit_details_action';

export const getSaveLayerAction = ({
  state,
  layer,
  layerIndex,
  setState,
  core,
  isNew,
  execute,
}: {
  state: XYState;
  layer: XYAnnotationLayerConfig;
  layerIndex: number;
  setState: StateSetter<XYState, unknown>;
  core: CoreStart;
  isNew?: boolean;
  execute: () => void;
}): LayerAction => {
  const displayName = isNew
    ? i18n.translate('xpack.lens.xyChart.annotations.addAnnotationGroupToLibrary', {
        defaultMessage: 'Add to library',
      })
    : i18n.translate('xpack.lens.xyChart.annotations.saveAnnotationGroupToLibrary', {
        defaultMessage: 'Save',
      });
  return {
    displayName,
    description: i18n.translate(
      'xpack.lens.xyChart.annotations.addAnnotationGroupToLibraryDescription',
      { defaultMessage: 'Saves annotation group as separate saved object' }
    ),
    execute: async (domElement) => {
      console.log('execute', domElement);
      if (domElement && isNew) {
        render(
          <EditDetailsFlyout
            domElement={domElement}
            groupLabel={i18n.translate(
              'xpack.lens.xyChart.annotations.addAnnotationGroupToLibrary',
              {
                defaultMessage: 'Add annotation group to library',
              }
            )}
            isNew={true}
            onConfirm={() => {
              execute();
            }}
          />,
          domElement
        );
      } else {
        execute();
      }
    },
    icon: 'save',
    isCompatible: true,
    'data-test-subj': 'lnsXY_annotationLayer_saveToLibrary',
  };
};
