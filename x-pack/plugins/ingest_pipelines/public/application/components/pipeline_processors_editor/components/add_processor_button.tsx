/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty } from '@elastic/eui';
import { usePipelineProcessorsContext } from '../context';

export interface Props {
  onClick: () => void;
}

export const AddProcessorButton: FunctionComponent<Props> = (props) => {
  const { onClick } = props;
  const {
    state: { editor },
  } = usePipelineProcessorsContext();
  return (
    <EuiButtonEmpty
      data-test-subj="addProcessorButton"
      disabled={editor.mode.id !== 'idle'}
      iconSide="left"
      iconType="plusInCircle"
      onClick={onClick}
    >
      {i18n.translate('xpack.ingestPipelines.pipelineEditor.addProcessorButtonLabel', {
        defaultMessage: 'Add a processor',
      })}
    </EuiButtonEmpty>
  );
};
