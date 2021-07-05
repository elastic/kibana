/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  count: number;
}

export function ErrorCount({ count }: Props) {
  return (
    <EuiText size="xs">
      <h4>
        <EuiTextColor
          color="danger"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
          }}
        >
          {i18n.translate('xpack.apm.transactionDetails.errorCount', {
            defaultMessage:
              '{errorCount, number} {errorCount, plural, one {Error} other {Errors}}',
            values: { errorCount: count },
          })}
        </EuiTextColor>
      </h4>
    </EuiText>
  );
}
