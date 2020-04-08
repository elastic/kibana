/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiFlyout, EuiFlyoutHeader, EuiFlyoutBody } from '@elastic/eui';
import { Pipeline } from '../../../../common/types';

export interface Props {
  visible: boolean;
  pipeline: Pipeline;
}

export const PipelineDetails: FunctionComponent<Props> = ({ pipeline, visible }) => {
  if (!visible) {
    return null;
  }

  return;
};
