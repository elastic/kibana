/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { pure } from 'recompose';

import { Placeholders } from '../../components/visualization_placeholder';

export const Network = pure(() => (
  <Placeholders timelineId="pane2-timeline" count={10} myRoute="Network" />
));
