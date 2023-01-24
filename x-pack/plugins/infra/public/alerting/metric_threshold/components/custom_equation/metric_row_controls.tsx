/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexItem, EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface MetricRowControlProps {
  onDelete: () => void;
  disableDelete: boolean;
}

export const MetricRowControls: React.FC<MetricRowControlProps> = ({ onDelete, disableDelete }) => {
  return (
    <>
      <EuiFlexItem grow={0}>
        <EuiButtonIcon
          iconType="trash"
          color="danger"
          style={{ marginBottom: '0.2em' }}
          onClick={onDelete}
          disabled={disableDelete}
          title={i18n.translate(
            'xpack.infra.metrics.alertFlyout.customEquationEditor.deleteRowButton',
            { defaultMessage: 'Delete' }
          )}
        />
      </EuiFlexItem>
    </>
  );
};
