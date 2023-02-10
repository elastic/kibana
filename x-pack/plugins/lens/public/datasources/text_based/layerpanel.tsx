/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { DatasourceLayerPanelProps } from '../../types';
import { TextBasedPrivateState } from './types';
import { ChangeIndexPattern } from '../../shared_components/dataview_picker/dataview_picker';

export interface TextBasedLayerPanelProps extends DatasourceLayerPanelProps<TextBasedPrivateState> {
  state: TextBasedPrivateState;
}

export function LayerPanel({ state, layerId, dataViews }: TextBasedLayerPanelProps) {
  const layer = state.layers[layerId];
  const dataView = state.indexPatternRefs.find((ref) => ref.id === layer.index);

  const notFoundTitleLabel = i18n.translate('xpack.lens.layerPanel.missingDataView', {
    defaultMessage: 'Data view not found',
  });
  return (
    <I18nProvider>
      <ChangeIndexPattern
        data-test-subj="textBasedLanguages-switcher"
        trigger={{
          label: dataView?.name || dataView?.title || notFoundTitleLabel,
          title: dataView?.title || notFoundTitleLabel,
          size: 's',
          fontWeight: 'normal',
          isDisabled: true,
        }}
        indexPatternId={layer.index}
        indexPatternRefs={dataViews.indexPatternRefs}
        isMissingCurrent={!dataView}
        onChangeIndexPattern={() => {}}
      />
    </I18nProvider>
  );
}
