/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import { UserAgent } from '../../../../typings/es_schemas/raw/fields/user_agent';

type UserAgentSummaryItemProps = UserAgent;

const Version = euiStyled('span')`
  font-size: ${({ theme }) => theme.eui.euiFontSizeS};
`;

export function UserAgentSummaryItem({
  name,
  version,
}: UserAgentSummaryItemProps) {
  return (
    <EuiToolTip
      content={i18n.translate(
        'xpack.apm.transactionDetails.userAgentAndVersionLabel',
        {
          defaultMessage: 'User agent & version',
        }
      )}
    >
      <>
        {name}&nbsp;
        {version && <Version>({version})</Version>}
      </>
    </EuiToolTip>
  );
}
