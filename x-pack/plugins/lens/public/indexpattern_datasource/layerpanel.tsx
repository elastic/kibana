/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { DataPublicPluginStart } from '../../../../../src/plugins/data/public';
import { DatasourceLayerPanelProps } from '../types';
import { IndexPatternPrivateState, IndexPatternRef } from './types';
import { ChangeIndexPattern } from './change_indexpattern';

export interface IndexPatternLayerPanelProps
  extends DatasourceLayerPanelProps<IndexPatternPrivateState> {
  state: IndexPatternPrivateState;
  onChangeIndexPattern: (newId: string) => void;
  data: DataPublicPluginStart;
}

export function LayerPanel({
  state,
  layerId,
  onChangeIndexPattern,
  data,
}: IndexPatternLayerPanelProps) {
  const layer = state.layers[layerId];
  const [dataViewsList, setDataViewsList] = useState<IndexPatternRef[]>([]);

  const indexPattern = state.indexPatterns[layer.indexPatternId];
  useEffect(() => {
    const fetchDataViews = async () => {
      const dataViewsRefs = await data.dataViews.getIdsWithTitle();
      setDataViewsList(dataViewsRefs);
    };
    fetchDataViews();
  }, [data, indexPattern]);

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
        indexPatternRefs={dataViewsList}
        isMissingCurrent={!indexPattern}
        onChangeIndexPattern={onChangeIndexPattern}
      />
    </I18nProvider>
  );
}
