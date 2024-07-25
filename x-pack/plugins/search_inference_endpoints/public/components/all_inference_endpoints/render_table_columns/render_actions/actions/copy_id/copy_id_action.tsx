/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiCopy } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useKibana } from '../../../../../../hooks/use_kibana';

interface CopyIDActionProps {
  modelId: string;
}

export const CopyIDAction = ({ modelId }: CopyIDActionProps) => {
  const {
    services: { notifications },
  } = useKibana();
  const toasts = notifications?.toasts;

  return (
    <EuiCopy textToCopy={modelId}>
      {(copy) => (
        <EuiButtonIcon
          aria-label={i18n.translate('xpack.searchInferenceEndpoints.actions.copyID', {
            defaultMessage: 'Copy inference endpoint ID {modelId}',
            values: { modelId },
          })}
          data-test-subj="inference-endpoints-action-copy-id-label"
          iconType="copyClipboard"
          onClick={() => {
            copy();
            toasts?.addSuccess({
              title: i18n.translate('xpack.searchInferenceEndpoints.actions.copyIDSuccess', {
                defaultMessage: 'Inference endpoint ID {modelId} copied',
                values: { modelId },
              }),
            });
          }}
          size="s"
        />
      )}
    </EuiCopy>
  );
};
