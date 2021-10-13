/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { DataPanel } from '../../../../data_panel';

export const RejectedCurationsPanel: React.FC = () => {
  return (
    <DataPanel
      title={<h2>Rececntly rejected sugggestions</h2>}
      subtitle={<span>Recent suggestions that are still valid can be re-enabled from here</span>}
      iconType="crossInACircleFilled"
      hasBorder
    >
      Embedded logs view goes here...
    </DataPanel>
  );
};
