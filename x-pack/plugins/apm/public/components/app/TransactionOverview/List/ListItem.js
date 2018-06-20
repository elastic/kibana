/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';

import { KuiTableRow, KuiTableRowCell } from '@kbn/ui-framework/components';
import {
  units,
  borderRadius,
  px,
  colors,
  fontFamilyCode,
  truncate
} from '../../../../style/variables';
import { RIGHT_ALIGNMENT } from '@elastic/eui';
import { RelativeLink, legacyEncodeURIComponent } from '../../../../utils/url';
import TooltipOverlay from '../../../shared/TooltipOverlay';

import { get } from 'lodash';
import { TRANSACTION_NAME } from '../../../../../common/constants';
import {
  asMillisWithDefault,
  asDecimal,
  tpmUnit
} from '../../../../utils/formatters';

const TransactionNameCell = styled(KuiTableRowCell)`
  font-family: ${fontFamilyCode};
  width: 38%;
`;

const TransactionNameLink = styled(RelativeLink)`
  ${truncate('100%')};
`;

const TransactionKPICell = styled(KuiTableRowCell)`
  max-width: none;
  width: 14%;
`;

const TransactionSpacerCell = styled(KuiTableRowCell)`
  max-width: none;
  width: 4%;
`;

const TransactionImpactCell = styled(KuiTableRowCell)`
  max-width: none;
  width: 16%;
`;

const ImpactBarBackground = styled.div`
  height: ${px(units.minus)};
  border-radius: ${borderRadius};
  background: ${colors.gray4};
`;

const ImpactBar = styled.div`
  height: ${px(units.minus)};
  background: ${colors.blue2};
  border-radius: ${borderRadius};
`;

function ImpactSparkline({ impact }) {
  if (!impact && impact !== 0) {
    return <div>N/A</div>;
  }

  return (
    <ImpactBarBackground>
      <ImpactBar style={{ width: `${impact}%` }} />
    </ImpactBarBackground>
  );
}

function TransactionListItem({ serviceName, transaction, type, impact }) {
  const transactionName = get({ transaction }, TRANSACTION_NAME);
  const transactionUrl = `${serviceName}/transactions/${legacyEncodeURIComponent(
    type
  )}/${legacyEncodeURIComponent(transactionName)}`;

  return (
    <KuiTableRow>
      <TransactionNameCell>
        <TooltipOverlay content={transactionName || 'N/A'}>
          <TransactionNameLink path={`/${transactionUrl}`}>
            {transactionName || 'N/A'}
          </TransactionNameLink>
        </TooltipOverlay>
      </TransactionNameCell>
      <TransactionKPICell align={RIGHT_ALIGNMENT}>
        {asMillisWithDefault(transaction.avg)}
      </TransactionKPICell>
      <TransactionKPICell align={RIGHT_ALIGNMENT}>
        {asMillisWithDefault(transaction.p95)}
      </TransactionKPICell>
      <TransactionKPICell align={RIGHT_ALIGNMENT}>
        {asDecimal(transaction.tpm)} {tpmUnit(type)}
      </TransactionKPICell>
      <TransactionSpacerCell />
      <TransactionImpactCell>
        <ImpactSparkline impact={impact} />
      </TransactionImpactCell>
    </KuiTableRow>
  );
}

export default TransactionListItem;
