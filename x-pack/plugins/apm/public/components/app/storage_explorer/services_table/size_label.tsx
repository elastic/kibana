/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip, EuiIcon } from '@elastic/eui';

export function SizeLabel() {
  return (
    <EuiToolTip
      content={i18n.translate(
        'xpack.apm.storageExplorer.sizeLabel.description',
        {
          defaultMessage: `The estimated storage size per service. This estimate includes primary and replica shards and is calculated by prorating the total size of your indices by the service's document count divided by the total number of documents.`,
        }
      )}
    >
      <>
        {i18n.translate('xpack.apm.storageExplorer.sizeLabel.title', {
          defaultMessage: 'Size',
        })}{' '}
        <EuiIcon
          size="s"
          color="subdued"
          type="questionInCircle"
          className="eui-alignTop"
        />
      </>
    </EuiToolTip>
  );
}
