/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { EuiFlyout, EuiFlyoutHeader, EuiTitle, EuiFlyoutBody } from '@elastic/eui';

import React, { FunctionComponent } from 'react';

import { PipelineEditorProcessor } from '../types';

import { ProcessorForm } from './processor_form';

export interface Props {
  processor: PipelineEditorProcessor;
  onClose: () => void;
}

export const FormFlyout: FunctionComponent<Props> = ({ onClose, processor }) => {
  const type = processor.type;
  return (
    <EuiFlyout onClose={onClose} aria-labelledby="flyoutComplicatedTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="flyoutComplicatedTitle">
            {i18n.translate('xpack.ingestPipelines.pipelineEditor.flyout.title', {
              defaultMessage: '{type} processor',
              values: { type },
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <ProcessorForm processor={processor as any} onSubmit={() => {}} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
