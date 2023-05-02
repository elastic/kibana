/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiTextColor } from '@elastic/eui';
import * as i18n from '../../../common/translations';
import { useCasesToast } from '../../../common/use_cases_toast';

import type { CaseUI } from '../../../../common';
import type { UseCopyIDActionProps } from '../types';

export const useCopyIDAction = ({ onActionSuccess }: UseCopyIDActionProps) => {
  const { showSuccessToast } = useCasesToast();

  const getAction = (selectedCase: CaseUI) => {
    return {
      name: <EuiTextColor>{i18n.COPY_ID_ACTION_LABEL}</EuiTextColor>,
      onClick: () => {
        navigator.clipboard.writeText(selectedCase.id).then(() => {
          onActionSuccess();
          showSuccessToast(i18n.COPY_ID_ACTION_SUCCESS);
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
