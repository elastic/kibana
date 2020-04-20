/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlyout, EuiFlyoutBody } from '@elastic/eui';

import React, { FunctionComponent } from 'react';

import { PipelineEditorProcessor } from '../types';

import { ProcessorSettingsForm, ProcessorSettingsFromOnSubmitArg } from '.';

export interface Props {
  processor: PipelineEditorProcessor | undefined;
  onSubmit: (processor: ProcessorSettingsFromOnSubmitArg) => void;
  onClose: () => void;
}

export const SettingsFormFlyout: FunctionComponent<Props> = ({ onClose, processor, onSubmit }) => {
  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutBody>
        <ProcessorSettingsForm processor={processor as any} onSubmit={onSubmit} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
