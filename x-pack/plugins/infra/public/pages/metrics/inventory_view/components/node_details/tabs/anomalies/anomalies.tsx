/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { AnomaliesTable } from '../../../ml/anomaly_detection/anomalies_table/anomalies_table';
import { TabContent, TabProps } from '../shared';

const TabComponent = (props: TabProps) => {
  const { node, onClose } = props;

  return (
    <TabContent>
      <AnomaliesTable closeFlyout={onClose} hostName={node.name} />
    </TabContent>
  );
};

export const AnomaliesTab = {
  id: 'anomalies',
  name: i18n.translate('xpack.infra.nodeDetails.tabs.anomalies', {
    defaultMessage: 'Anomalies',
  }),
  content: TabComponent,
};
