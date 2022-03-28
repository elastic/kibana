/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingContent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useContext, useMemo } from 'react';
import { useKibanaContextForPlugin } from '../../../../../../../hooks/use_kibana';
import { TabContent, TabProps } from '../shared';
import { Source } from '../../../../../../../containers/metrics_source';
import { findInventoryModel } from '../../../../../../../../common/inventory_models';
import { InventoryItemType } from '../../../../../../../../common/inventory_models/types';
import { useMetadata } from '../../../../../metric_detail/hooks/use_metadata';
import { useWaffleTimeContext } from '../../../../hooks/use_waffle_time';

const TabComponent = (props: TabProps) => {
  const nodeId = props.node.id;
  const nodeType = props.nodeType as InventoryItemType;
  const inventoryModel = findInventoryModel(nodeType);
  const { sourceId } = useContext(Source.Context);
  const { currentTimeRange } = useWaffleTimeContext();
  const { loading, metadata } = useMetadata(
    nodeId,
    nodeType,
    inventoryModel.requiredMetrics,
    sourceId,
    currentTimeRange
  );
  const {
    services: { osquery },
  } = useKibanaContextForPlugin();
  // @ts-expect-error
  const OsqueryAction = osquery?.OsqueryAction;

  // avoids component rerender when resizing the popover
  const content = useMemo(() => {
    // TODO: Add info when Osquery plugin is not available
    if (loading || !OsqueryAction) {
      return (
        <TabContent>
          <EuiLoadingContent lines={10} />
        </TabContent>
      );
    }

    return (
      <TabContent>
        <OsqueryAction agentId={metadata?.info?.agent?.id} />
      </TabContent>
    );
  }, [OsqueryAction, loading, metadata]);

  return content;
};

export const OsqueryTab = {
  id: 'osquery',
  name: i18n.translate('xpack.infra.nodeDetails.tabs.osquery', {
    defaultMessage: 'Osquery',
  }),
  content: TabComponent,
};
