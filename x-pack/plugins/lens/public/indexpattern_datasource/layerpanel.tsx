/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n/react';
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

  return (
    <I18nProvider>
      <ChangeIndexPattern
        data-test-subj="indexPattern-switcher"
        trigger={{
          label: state.indexPatterns[layer.indexPatternId].title,
          title: state.indexPatterns[layer.indexPatternId].title,
          'data-test-subj': 'lns_layerIndexPatternLabel',
          size: 's',
          fontWeight: 'normal',
        }}
        indexPatternId={layer.indexPatternId}
        indexPatternRefs={state.indexPatternRefs}
        onChangeIndexPattern={onChangeIndexPattern}
      />
    </I18nProvider>
  );
}
