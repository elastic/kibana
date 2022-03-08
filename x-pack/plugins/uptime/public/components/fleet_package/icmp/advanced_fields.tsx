/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

export const ICMPAdvancedFields = ({ children }: { children?: React.ReactNode }) => {
  if (!!children) {
    return (
      <EuiAccordion
        id="uptimeFleetIcmpAdvancedOptions"
        buttonContent={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.icmpAdvancedOptions"
            defaultMessage="Advanced ICMP options"
          />
        }
        data-test-subj="syntheticsICMPAdvancedFieldsAccordion"
      >
        <EuiSpacer size="xl" />
        {children}
      </EuiAccordion>
    );
  }

  return <></>;
};
