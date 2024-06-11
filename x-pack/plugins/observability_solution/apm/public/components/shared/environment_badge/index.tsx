/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ItemsBadge } from '../item_badge';
import { PopoverBadge } from '../popover_badge';
import { EuiCode, EuiLink } from '@elastic/eui';
import { isEmpty } from 'lodash';
import { FormattedMessage } from 'react-intl';

interface Props {
  environments?: string[];
}
``;
export function EnvironmentBadge({ environments = [] }: Props) {
  if (isEmpty(environments)) {
    return (
      <PopoverBadge
        title={i18n.translate('xpack.apm.servicesTable.notAvailable.title', {
          defaultMessage: 'No environment detected.',
        })}
        content={
          <FormattedMessage
            id="xpack.apm.servicesTable.notAvailable.content"
            defaultMessage="Declare your service environment by adding {field} to your logs."
            values={{
              field: <EuiCode>service.environment</EuiCode>,
            }}
          />
        }
        footer={
          <EuiLink
            href="https://demo.elastic.co/app/observabilityOnboarding/customLogs/?category=logs"
            external
          >
            {i18n.translate('xpack.apm.servicesTable.notAvailable.footer', {
              defaultMessage: 'See documentation',
            })}
          </EuiLink>
        }
      />
    );
  }

  return (
    environments &&
    environments.length > 0 && (
      <ItemsBadge
        items={environments ?? []}
        multipleItemsMessage={i18n.translate('xpack.apm.servicesTable.environmentCount', {
          values: { environmentCount: environments.length },
          defaultMessage: '{environmentCount, plural, one {1 environment} other {# environments}}',
        })}
      />
    )
  );
}
