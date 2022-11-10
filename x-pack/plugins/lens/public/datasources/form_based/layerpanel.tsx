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
import { FormBasedPrivateState } from './types';
import { ChangeIndexPattern } from '../../shared_components/dataview_picker/dataview_picker';

export interface FormBasedLayerPanelProps extends DatasourceLayerPanelProps<FormBasedPrivateState> {
  state: FormBasedPrivateState;
  onChangeIndexPattern: (newId: string) => void;
}

export function LayerPanel({
  state,
  layerId,
  onChangeIndexPattern,
  dataViews,
}: FormBasedLayerPanelProps) {
  const layer = state.layers[layerId];

  const indexPattern = dataViews.indexPatterns[layer.indexPatternId];
  const notFoundTitleLabel = i18n.translate('xpack.lens.layerPanel.missingDataView', {
    defaultMessage: 'Data view not found',
  });
  const indexPatternRefs = dataViews.indexPatternRefs.map((ref) => {
    const isPersisted = dataViews.indexPatterns[ref.id]?.isPersisted ?? true;
    return {
      ...ref,
      isAdhoc: !isPersisted,
    };
  });
  return (
    <I18nProvider>
      <ChangeIndexPattern
        data-test-subj="indexPattern-switcher"
        trigger={{
          label: indexPattern?.name || notFoundTitleLabel,
          title: indexPattern?.title || notFoundTitleLabel,
          'data-test-subj': 'lns_layerIndexPatternLabel',
          size: 's',
          fontWeight: 'normal',
        }}
        indexPatternId={layer.indexPatternId}
        indexPatternRefs={indexPatternRefs}
        isMissingCurrent={!indexPattern}
        onChangeIndexPattern={onChangeIndexPattern}
      />
    </I18nProvider>
  );
}
