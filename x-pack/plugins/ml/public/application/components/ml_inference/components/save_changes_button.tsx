/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface SaveChangesButtonProps {
  onClick: () => void;
  disabled: boolean;
}

export const SaveChangesButton: FC<SaveChangesButtonProps> = ({ onClick, disabled }) => (
  <EuiButtonEmpty
    size="xs"
    onClick={onClick}
    disabled={disabled}
    data-test-subj="mlTrainedModelsInferencePipelineFlyoutSaveChangesButton"
  >
    {i18n.translate(
      'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.saveChangesButton',
      { defaultMessage: 'Save changes' }
    )}
  </EuiButtonEmpty>
);
