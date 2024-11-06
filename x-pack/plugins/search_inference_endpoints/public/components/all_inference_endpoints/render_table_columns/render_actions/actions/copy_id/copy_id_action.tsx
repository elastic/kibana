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
  inferenceId: string;
}

export const CopyIDAction = ({ inferenceId }: CopyIDActionProps) => {
  const {
    services: { notifications },
  } = useKibana();
  const toasts = notifications?.toasts;

  return (
    <EuiCopy textToCopy={inferenceId}>
      {(copy) => (
        <EuiButtonIcon
          aria-label={i18n.translate('xpack.searchInferenceEndpoints.actions.copyID', {
            defaultMessage: 'Copy inference endpoint ID {inferenceId}',
            values: { inferenceId },
          })}
          data-test-subj="inference-endpoints-action-copy-id-label"
          iconType="copyClipboard"
          onClick={() => {
            copy();
            toasts?.addSuccess({
              title: i18n.translate('xpack.searchInferenceEndpoints.actions.copyIDSuccess', {
                defaultMessage: 'Inference endpoint ID {inferenceId} copied',
                values: { inferenceId },
              }),
            });
          }}
          size="s"
        />
      )}
    </EuiCopy>
  );
};
