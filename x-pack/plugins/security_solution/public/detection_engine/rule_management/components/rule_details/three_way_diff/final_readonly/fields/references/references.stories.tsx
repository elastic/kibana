/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ReferencesReadOnly } from './references';

export default {
  component: ReferencesReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/references',
};

export const Default = () => (
  <ReferencesReadOnly
    references={[
      'https://www.elastic.co/guide/en/security/current/prebuilt-ml-jobs.html',
      'https://docs.elastic.co/en/integrations/beaconing',
      'https://www.elastic.co/security-labs/identifying-beaconing-malware-using-elastic',
    ]}
  />
);

export const EmptyArrayValue = () => <ReferencesReadOnly references={[]} />;
