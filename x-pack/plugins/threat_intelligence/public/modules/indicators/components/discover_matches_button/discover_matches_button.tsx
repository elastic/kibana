/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import React, { VFC } from 'react';
import { useKibana } from '../../../../hooks';

export const DiscoverButton: VFC<{ id?: unknown; value: number; label?: string }> = ({
  id,
  value,
  label,
}) => {
  const {
    services: { http, discover },
  } = useKibana();

  const locator = discover.locator!;

  return (
    <EuiButtonEmpty
      size="xs"
      color={Number(value) ? 'accent' : 'primary'}
      onClick={async () => {
        const data = await http.get<any>(`/api/threat_intelligence/${id}/match`);

        // This endpoint returns both query and matches for the given indicator;
        // only using the query here, for the demo purposes.
        const url = await locator.getUrl({
          filters: [
            {
              query: data.query,
              meta: {
                index: '*',
              },
            },
          ],
          timeRange: {
            from: 'now-1y',
            to: 'now',
          },
        });

        window.location.href = url;
      }}
    >
      {label}
    </EuiButtonEmpty>
  );
};
