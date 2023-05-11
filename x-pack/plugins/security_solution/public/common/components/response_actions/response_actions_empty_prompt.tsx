/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCode, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { PERMISSION_DENIED } from '../../../detection_engine/rule_response_actions/osquery/translations';

interface ResponseActionsEmptyPromptProps {
  type: 'endpoint' | 'osquery';
}

export const ResponseActionsEmptyPrompt = ({ type }: ResponseActionsEmptyPromptProps) => {
  const iconType = useMemo(() => {
    switch (type) {
      case 'endpoint':
        return 'logoSecurity';
      case 'osquery':
        return 'logoOsquery';
    }
  }, [type]);
  return (
    <EuiEmptyPrompt
      iconType={iconType}
      title={<h2>{PERMISSION_DENIED}</h2>}
      titleSize="xs"
      body={
        <FormattedMessage
          id="xpack.securitySolution.osquery.results.missingPrivileges"
          defaultMessage="To access these results, ask your administrator for {integration} Kibana
              privileges."
          values={{
            integration: <EuiCode>{type}</EuiCode>,
          }}
        />
      }
    />
  );
};
