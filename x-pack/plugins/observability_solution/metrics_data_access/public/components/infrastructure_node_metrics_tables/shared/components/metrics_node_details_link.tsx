/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from '@kbn/datemath';
import { EuiLink } from '@elastic/eui';
import React from 'react';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';
import type { InventoryItemType } from '../../../../../common/inventory_models/types';
import { useNodeDetailsRedirect } from '../../../../pages/link_to/use_node_details_redirect';

type ExtractStrict<T, U extends T> = Extract<T, U>;

interface MetricsNodeDetailsLinkProps {
  id: string;
  label: string;
  nodeType: ExtractStrict<InventoryItemType, 'host' | 'container' | 'pod'>;
  timerange: { from: string; to: string };
}

export const MetricsNodeDetailsLink = ({
  id,
  label,
  nodeType,
  timerange,
}: MetricsNodeDetailsLinkProps) => {
  const { getNodeDetailUrl } = useNodeDetailsRedirect();
  const linkProps = useLinkProps(
    getNodeDetailUrl({
      nodeType,
      nodeId: id,
      search: {
        from: parse(timerange.from)?.valueOf(),
        to: parse(timerange.to)?.valueOf(),
      },
    })
  );

  return (
    <EuiLink data-test-subj="infraMetricsNodeDetailsLinkLink" href={linkProps.href}>
      {label}
    </EuiLink>
  );
};
