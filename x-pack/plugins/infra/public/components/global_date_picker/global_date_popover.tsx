/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { CalendarContainer } from 'react-datepicker';

export const GlobalDatePopover: React.SFC = props => (
  <CalendarContainer style={{ width: '390px' }}>{props.children}</CalendarContainer>
);
