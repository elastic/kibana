/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadge, EuiToolTip } from '@elastic/eui';

interface Props {
  environments: string[];
}
export const EnvironmentBadge: React.FC<Props> = ({ environments = [] }) => {
  if (environments.length < 3) {
    return (
      <>
        {environments.map((env) => (
          <EuiBadge color="hollow" key={env}>
            {env}
          </EuiBadge>
        ))}
      </>
    );
  }
  return (
    <EuiToolTip
      position="right"
      content={environments.map((env) => (
        <React.Fragment key={env}>
          {env}
          <br />
        </React.Fragment>
      ))}
    >
      <EuiBadge>
        {i18n.translate('xpack.apm.servicesTable.environmentCount', {
          values: { environmentCount: environments.length },
          defaultMessage:
            '{environmentCount, plural, one {1 environment} other {# environments}}',
        })}
      </EuiBadge>
    </EuiToolTip>
  );
};
