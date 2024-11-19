/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import { DetectorList } from './detector_list';

export const AdvancedDetectorsSummary: FC = () => (
  <DetectorList isActive={false} onEditJob={() => {}} onDeleteJob={() => {}} />
);
