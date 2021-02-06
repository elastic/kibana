/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadge } from '@elastic/eui';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import { useTheme } from '../../../hooks/use_theme';
import { px } from '../../../../public/style/variables';
import { units } from '../../../style/variables';

interface Props {
  count: number;
}

const Badge = (euiStyled(EuiBadge)`
  margin-top: ${px(units.eighth)};
` as unknown) as typeof EuiBadge;

export function ErrorCountSummaryItemBadge({ count }: Props) {
  const theme = useTheme();

  return (
    <Badge color={theme.eui.euiColorDanger}>
      {i18n.translate('xpack.apm.transactionDetails.errorCount', {
        defaultMessage:
          '{errorCount, number} {errorCount, plural, one {Error} other {Errors}}',
        values: { errorCount: count },
      })}
    </Badge>
  );
}
