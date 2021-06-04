/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { RARE_DETECTOR_TYPE } from './rare_view';
import { DetectorDescription } from './detector_description';

interface Props {
  rareDetectorType: RARE_DETECTOR_TYPE;
}

export const RareDetectorsSummary: FC<Props> = ({ rareDetectorType }) => {
  return <DetectorDescription detectorType={rareDetectorType} />;
};
