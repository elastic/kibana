/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import euiThemeLight from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import React, { Fragment } from 'react';
import styled from 'styled-components';
import { idx } from '@kbn/elastic-idx';
import { Transaction } from '../../../../../typings/es_schemas/ui/Transaction';
import { fontSize } from '../../../../style/variables';
import { APMLink } from '../../../shared/Links/APMLink';

const LinkLabel = styled.span`
  font-size: ${fontSize};
`;

interface Props {
  errorCount: number;
  transaction: Transaction;
  verbose?: boolean;
}

export const ErrorCountBadge: React.SFC<Props> = ({
  errorCount = 0,
  transaction,
  verbose
}) => {
  const toolTipContent = i18n.translate(
    'xpack.apm.transactionDetails.errorsOverviewLinkTooltip',
    {
      values: { errorCount },
      defaultMessage:
        '{errorCount, plural, one {View 1 related error} other {View # related errors}}'
    }
  );

  const errorCountBadge = (
    <EuiBadge
      color={euiThemeLight.euiColorDanger}
      onClick={(event: any) => {
        (event as MouseEvent).stopPropagation();
      }}
      onClickAriaLabel={toolTipContent}
    >
      {errorCount}
    </EuiBadge>
  );

  return (
    <APMLink
      path={`/${idx(transaction, _ => _.service.name)}/errors`}
      query={{
        kuery: encodeURIComponent(
          `trace.id : "${transaction.trace.id}" and transaction.id : "${
            transaction.transaction.id
          }"`
        )
      }}
      color="danger"
      style={{ textDecoration: 'none' }}
    >
      {verbose ? (
        <Fragment>
          {errorCountBadge}
          <LinkLabel>
            &nbsp;
            {i18n.translate('xpack.apm.transactionDetails.errorsOverviewLink', {
              values: { errorCount },
              defaultMessage:
                '{errorCount, plural, one {Related error} other {Related errors}}'
            })}
          </LinkLabel>
        </Fragment>
      ) : (
        <EuiToolTip content={toolTipContent}>{errorCountBadge}</EuiToolTip>
      )}
    </APMLink>
  );
};
