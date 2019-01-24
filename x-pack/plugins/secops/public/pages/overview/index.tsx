/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { pure } from 'recompose';

import { Pane, Pane1FlexContent, PaneScrollContainer } from '../../components/page';
import { Placeholders } from '../../components/visualization_placeholder';

export const Overview = pure(() => (
  <Pane data-test-subj="pane">
    <PaneScrollContainer data-test-subj="pane1ScrollContainer">
      <Pane1FlexContent>
        <Placeholders count={10} myRoute="Overview" />
      </Pane1FlexContent>
    </PaneScrollContainer>
  </Pane>
));
