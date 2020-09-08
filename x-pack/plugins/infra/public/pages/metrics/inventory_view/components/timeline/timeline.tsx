/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { euiStyled } from '../../../../../../../observability/public';

export const Timeline = () => {
  return <TimelineContainer />;
};

const TimelineContainer = euiStyled.div`
  background-color: ${(props) => props.theme.eui.euiPageBackgroundColor};
  border-top: 1px solid ${(props) => props.theme.eui.euiColorMediumShade};
  height: 200px;
  width: 100%;
`;
