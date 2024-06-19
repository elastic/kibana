/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiTextColor } from '@elastic/eui';
import { InferenceEndpointUI } from '../../../../types';
import * as i18n from '../../../../../../../common/translations';
import { useInferenceToast } from '../../../../../../hooks/use_inference_toast';
import { UseCopyIDActionProps } from '../types';

export const useCopyIDAction = ({ onActionSuccess }: UseCopyIDActionProps) => {
  const { showSuccessToast } = useInferenceToast();

  const getAction = (inferenceEndpoint: InferenceEndpointUI) => {
    return {
      name: <EuiTextColor>{i18n.COPY_ID_ACTION_LABEL}</EuiTextColor>,
      onClick: () => {
        navigator.clipboard.writeText(inferenceEndpoint.endpoint.model_id).then(() => {
          onActionSuccess();
          showSuccessToast(i18n.COPY_ID_ACTION_SUCCESS);
        });
      },
      icon: <EuiIcon type="copyClipboard" size="m" />,
      key: 'inference-endpoints-action-copy-id',
    };
  };

  return { getAction };
};

export type UseCopyIDAction = ReturnType<typeof useCopyIDAction>;
