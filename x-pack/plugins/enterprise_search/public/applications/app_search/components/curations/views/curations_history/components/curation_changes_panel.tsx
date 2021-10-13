/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { DataPanel } from '../../../../data_panel';

export const CurationChangesPanel: React.FC = () => {
  return (
    <DataPanel
      title={<h2>Automated curation changes</h2>}
      subtitle={<span>A detailed log of recent changes to your automated curations</span>}
      iconType="visTable"
      hasBorder
    >
      Embedded logs view goes here...
    </DataPanel>
  );
};
