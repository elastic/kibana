/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText } from '@elastic/eui';
import { popupVersionsMap } from '../protections/popup_options_to_versions';

export const SupportedVersionNotice = ({ optionName }: { optionName: string }) => {
  const version = popupVersionsMap.get(optionName);
  if (!version) {
    return null;
  }

  return (
    <EuiText color="subdued" size="xs" data-test-subj="policySupportedVersions">
      <i>
        <FormattedMessage
          id="xpack.securitySolution.endpoint.policyDetails.supportedVersion"
          defaultMessage="Agent version {version}"
          values={{ version }}
        />
      </i>
    </EuiText>
  );
};
