/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiTextColor } from '@elastic/eui';
import { InferenceEndpointUI } from '../types';

interface UseActionProps {
  onAction: () => void;
  onActionSuccess: () => void;
  isDisabled: boolean;
}

type UseCopyIDActionProps = Pick<UseActionProps, 'onActionSuccess'>;

export const useCopyIDAction = ({ onActionSuccess }: UseCopyIDActionProps) => {
  const getAction = (inferenceEndpoint: InferenceEndpointUI) => {
    return {
      name: <EuiTextColor>{'Copy Inference ID'}</EuiTextColor>,
      onClick: () => {
        navigator.clipboard.writeText(inferenceEndpoint.endpoint).then(() => {
          onActionSuccess();
        });
      },
      icon: <EuiIcon type="copyClipboard" size="m" />,
      key: 'inference-endpoints-action-copy-id',
    };
  };

  return { getAction };
};

export type UseCopyIDAction = ReturnType<typeof useCopyIDAction>;
