/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import rison from '@kbn/rison';
import { EuiLink } from '@elastic/eui';
import { crateInfraNodeDetailsLink } from '../../../../../hooks/create_use_rules_link';
import { StringOrNull } from '../../../../..';

interface Props {
  name: StringOrNull;
  id: string;
  timerange: { from: number; to: number };
}

export function HostLink({ name, id, timerange }: Props) {
  const linkProps = crateInfraNodeDetailsLink({
    assetType: 'host',
    assetId: id,
    search: {
      from: `${timerange.from}`,
      to: `${timerange.to}`,
      ...(!!name
        ? {
            assetDetails: rison.encodeUnknown({
              name,
            }),
          }
        : undefined),
    },
  })();

  return (
    <EuiLink data-test-subj="o11yInfraNodeDetailsLink" {...linkProps}>
      {name}
    </EuiLink>
  );
}
