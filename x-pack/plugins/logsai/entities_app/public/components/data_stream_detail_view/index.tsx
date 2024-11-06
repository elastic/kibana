/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EntityDetailViewWithoutParams } from '../entity_detail_view';
import { useEntitiesAppParams } from '../../hooks/use_entities_app_params';

export function DataStreamDetailView() {
  const {
    path: { key, tab },
  } = useEntitiesAppParams('/data_stream/{key}/{tab}');
  return (
    <EntityDetailViewWithoutParams
      type="data_stream"
      entityKey={key}
      tab={tab}
      getAdditionalTabs={() => [
        {
          name: 'parsing',
          label: i18n.translate('xpack.entities.dataStreamDetailView.parsingTab', {
            defaultMessage: 'Parsing',
          }),
          content: <></>,
        },
      ]}
    />
  );
}
