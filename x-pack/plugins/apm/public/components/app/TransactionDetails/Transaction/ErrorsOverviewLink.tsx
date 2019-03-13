/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
import { idx } from 'x-pack/plugins/apm/common/idx';
import { KibanaLink } from 'x-pack/plugins/apm/public/components/shared/Links/KibanaLink';
import { legacyEncodeURIComponent } from 'x-pack/plugins/apm/public/components/shared/Links/url_helpers';
import { Transaction } from '../../../../../typings/es_schemas/Transaction';
import { colors, fontSizes } from '../../../../style/variables';

const LinkLabel = styled.span`
  font-size: ${fontSizes.small};
  color: ${colors.danger};
`;

interface ErrorsOverviewLinkProps {
  errorCount: number;
  transaction: Transaction;
  showLabel?: boolean;
}

export const ErrorsOverviewLink: React.SFC<ErrorsOverviewLinkProps> = ({
  errorCount,
  transaction,
  showLabel
}) => {
  return (
    <KibanaLink
      pathname={'/app/apm'}
      hash={`/${idx(transaction, _ => _.service.name)}/errors`}
      query={{
        kuery: legacyEncodeURIComponent(
          `trace.id : "${transaction.trace.id}" and transaction.id : "${
            transaction.transaction.id
          }"`
        )
      }}
    >
      <EuiToolTip
        content={i18n.translate(
          'xpack.apm.transactionDetails.errorsOverviewLinkTooltip',
          {
            values: { errorCount: errorCount || 0 },
            defaultMessage:
              '{errorCount, plural, one {View 1 related error} other {View # related errors}}'
          }
        )}
      >
        <span>
          <EuiBadge
            color={colors.danger}
            onClick={(event: any) => {
              (event as MouseEvent).stopPropagation();
            }}
          >
            {errorCount}
          </EuiBadge>

          {showLabel ? (
            <LinkLabel>
              &nbsp;
              {i18n.translate(
                'xpack.apm.transactionDetails.errorsOverviewLink',
                {
                  values: { errorCount: errorCount || 0 },
                  defaultMessage:
                    '{errorCount, plural, one {Related error} other {Related errors}}'
                }
              )}
            </LinkLabel>
          ) : null}
        </span>
      </EuiToolTip>
    </KibanaLink>
  );
};
