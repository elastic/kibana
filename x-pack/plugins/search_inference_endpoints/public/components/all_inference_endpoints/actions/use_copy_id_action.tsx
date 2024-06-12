/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiTextColor } from '@elastic/eui';

interface UseActionProps {
  onAction: () => void;
  onActionSuccess: () => void;
  isDisabled: boolean;
}

type UseCopyIDActionProps = Pick<UseActionProps, 'onActionSuccess'>;

export const useCopyIDAction = ({ onActionSuccess }: UseCopyIDActionProps) => {
  const getAction = (id: any) => {
    return {
      name: <EuiTextColor>{'Copy Inference ID'}</EuiTextColor>,
      onClick: () => {
        navigator.clipboard.writeText(id).then(() => {
          onActionSuccess();
        });
      },
      'data-test-subj': 'cases-action-copy-id',
      icon: <EuiIcon type="copyClipboard" size="m" />,
      key: 'cases-action-copy-id',
    };
  };

  return { getAction };
};

export type UseCopyIDAction = ReturnType<typeof useCopyIDAction>;
