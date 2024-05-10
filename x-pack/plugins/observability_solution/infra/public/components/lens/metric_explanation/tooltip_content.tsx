/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { HTMLAttributes } from 'react';
import { EuiText, EuiLink } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { HOST_METRICS_DOC_HREF } from '../../../common/visualizations/constants';

export interface TooltipContentProps extends Pick<HTMLAttributes<HTMLDivElement>, 'style'> {
  description: string;
  formula?: string;
  showDocumentationLink?: boolean;
}

export const TooltipContent = React.memo(
  ({ description, formula, showDocumentationLink = false, style }: TooltipContentProps) => {
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
                id="xpack.infra.hostsViewPage.table.tooltip.formula"
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
        {showDocumentationLink && (
          <p>
            <FormattedMessage
              id="xpack.infra.hostsViewPage.table.tooltip.documentationLabel"
              defaultMessage="See {documentation} for more information"
              values={{
                documentation: (
                  <EuiLink
                    data-test-subj="hostsViewTooltipDocumentationLink"
                    href={HOST_METRICS_DOC_HREF}
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.infra.hostsViewPage.table.tooltip.documentationLink"
                      defaultMessage="documentation"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        )}
      </EuiText>
    );
  }
);
