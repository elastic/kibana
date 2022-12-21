/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiText, EuiSpacer } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import { ConfigKey, MonitorServiceLocation } from '../types';

export const Disclaimer: React.FC = () => {
  const { watch } = useFormContext();
  const [locations]: [locations: MonitorServiceLocation[]] = watch([ConfigKey.LOCATIONS]);

  const includesServiceLocation = locations.find((location) => location.isServiceManaged === true);

  return includesServiceLocation ? (
    <>
      <EuiSpacer size="l" />
      <EuiText size="xs" color="subdued">
        <p>
          {i18n.translate('xpack.synthetics.monitorConfig.locations.disclaimer', {
            defaultMessage:
              'You consent to the transfer of testing instructions and the output of such instructions (including any data shown therein) to your selected testing location, on infrastructure provided by a cloud service provider chosen by Elastic.',
          })}
        </p>
      </EuiText>
    </>
  ) : null;
};
