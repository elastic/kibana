/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { DatasourceLayerPanelProps } from '../types';
import { IndexPatternPrivateState } from './types';
import { ChangeIndexPattern } from './change_indexpattern';

export interface IndexPatternLayerPanelProps
  extends DatasourceLayerPanelProps<IndexPatternPrivateState> {
  state: IndexPatternPrivateState;
  onChangeIndexPattern: (newId: string) => void;
}

export function LayerPanel({ state, layerId, onChangeIndexPattern }: IndexPatternLayerPanelProps) {
  const layer = state.layers[layerId];

  const indexPattern = state.indexPatterns[layer.indexPatternId];
  const notFoundTitleLabel = i18n.translate('xpack.lens.layerPanel.missingDataView', {
    defaultMessage: 'Data view not found',
  });

  return (
    <I18nProvider>
      <ChangeIndexPattern
        data-test-subj="indexPattern-switcher"
        trigger={{
          label: indexPattern?.title || notFoundTitleLabel,
          title: indexPattern?.title || notFoundTitleLabel,
          'data-test-subj': 'lns_layerIndexPatternLabel',
          size: 's',
          fontWeight: 'normal',
        }}
        indexPatternId={layer.indexPatternId}
        indexPatternRefs={state.indexPatternRefs}
        isMissingCurrent={!indexPattern}
        onChangeIndexPattern={onChangeIndexPattern}
      />
    </I18nProvider>
  );
}
