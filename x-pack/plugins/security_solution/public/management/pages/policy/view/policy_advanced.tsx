/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { EuiFieldText, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { WrapperPage } from '../../../../common/components/wrapper_page';

export const PolicyAdvanced = React.memo(() => {
  /* const onChange = useCallback((e) => {});*/
  return (
    <WrapperPage>
      <EuiText>
        <h1>
          <FormattedMessage id="xpack.securitySolution.policyAdvanced.field" defaultMessage="hi!" />
        </h1>
      </EuiText>
      <EuiFieldText value="hello" onChange={} />
    </WrapperPage>
  );
});
PolicyAdvanced.displayName = 'PolicyAdvanced';
