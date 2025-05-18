/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiIcon, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

interface Props {
  docType: 'transaction' | 'span';
}

export function OrphanItemTooltipIcon({ docType }: Props) {
  return (
    <EuiToolTip
      title={i18n.translate('xpack.apm.waterfallItem.euiToolTip.orphanLabel', {
        defaultMessage: 'Orphan',
      })}
      content={i18n.translate('xpack.apm.waterfallItem.euiToolTip.orphanDescriotion', {
        defaultMessage:
          'This {type} was initially orphaned due to missing trace context but has been reparented to the root transaction to restore the execution flow',
        values: { type: docType },
      })}
    >
      <EuiIcon type="unlink" size="s" color="danger" />
    </EuiToolTip>
  );
}
