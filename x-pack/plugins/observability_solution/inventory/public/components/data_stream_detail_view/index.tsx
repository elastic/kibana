/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EntityDetailView } from '../entity_detail_view';
import { DataStreamManagementView } from '../data_stream_management_view';

export function DataStreamDetailView() {
  return (
    <EntityDetailView
      getAdditionalTabs={() => [
        {
          name: 'management',
          label: i18n.translate('xpack.inventory.dataStreamDetailView.managementTab', {
            defaultMessage: 'Manage',
          }),
          content: <DataStreamManagementView />,
        },
      ]}
    />
  );
}
