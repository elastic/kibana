/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { DetectorList } from './detector_list';

export const AdvancedDetectorsSummary: FC = () => (
  <DetectorList isActive={false} onEditJob={() => {}} onDeleteJob={() => {}} />
);
