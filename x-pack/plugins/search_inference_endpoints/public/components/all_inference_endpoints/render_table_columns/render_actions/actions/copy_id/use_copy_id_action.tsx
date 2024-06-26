/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiTextColor } from '@elastic/eui';
import React from 'react';
import * as i18n from '../../../../../../../common/translations';
import { useKibana } from '../../../../../../hooks/use_kibana';
import { InferenceEndpointUI } from '../../../../types';
import { UseCopyIDActionProps } from '../types';

export const useCopyIDAction = ({ onActionSuccess }: UseCopyIDActionProps) => {
  const {
    services: { notifications },
  } = useKibana();
  const toasts = notifications?.toasts;

  const getAction = (inferenceEndpoint: InferenceEndpointUI) => {
    return {
      name: (
        <EuiTextColor data-test-subj="inference-endpoints-action-copy-id-label">
          {i18n.COPY_ID_ACTION_LABEL}
        </EuiTextColor>
      ),
      onClick: () => {
        navigator.clipboard.writeText(inferenceEndpoint.endpoint.model_id).then(() => {
          onActionSuccess();
          toasts?.addSuccess({ title: i18n.COPY_ID_ACTION_SUCCESS });
        });
      },
      icon: <EuiIcon type="copyClipboard" size="m" />,
    };
  };

  return { getAction };
};
