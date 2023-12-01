/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { WATCH_VIDEO_DESCRIPTION1, WATCH_VIDEO_DESCRIPTION2 } from '../translations';

const OverviewVideoDescriptionComponent = () => (
  <>
    <p>{WATCH_VIDEO_DESCRIPTION1}</p>
    <p className="step-paragraph">{WATCH_VIDEO_DESCRIPTION2}</p>
  </>
);

export const OverviewVideoDescription = React.memo(OverviewVideoDescriptionComponent);
