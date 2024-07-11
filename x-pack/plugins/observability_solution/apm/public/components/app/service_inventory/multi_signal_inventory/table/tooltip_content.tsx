/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { HTMLAttributes, ReactElement } from 'react';
import { EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';

export interface TooltipContentProps extends Pick<HTMLAttributes<HTMLDivElement>, 'style'> {
  description: ReactElement | string;
  formula?: string;
}

export const TooltipContent = React.memo(({ description, formula, style }: TooltipContentProps) => {
  const onClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation();
  };

  return (
    <EuiText size="xs" style={style} onClick={onClick}>
      <p>{description}</p>
      {formula && (
        <p>
          <strong>
            <FormattedMessage
              id="xpack.apm.multiSignal.table.tooltip.formula"
              defaultMessage="Formula Calculation:"
            />
          </strong>
          <br />
          <code
            css={css`
              word-break: break-word;
            `}
          >
            {formula}
          </code>
        </p>
      )}
    </EuiText>
  );
});
