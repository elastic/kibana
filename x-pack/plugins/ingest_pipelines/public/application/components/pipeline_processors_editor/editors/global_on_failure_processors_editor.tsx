/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';

import { PipelineProcessorsEditor } from '../components';

export const GlobalOnFailureProcessorsEditor: FunctionComponent = () => {
  return <PipelineProcessorsEditor stateSlice="onFailure" />;
};
