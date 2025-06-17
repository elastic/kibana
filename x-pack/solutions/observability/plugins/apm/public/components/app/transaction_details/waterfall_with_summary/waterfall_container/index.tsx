/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { History } from 'history';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { fromQuery, toQuery } from '../../../../shared/links/url_helpers';
import { Waterfall } from './waterfall';
import { OrphanTraceItemsWarning } from './waterfall/orphan_trace_items_warning';
import { WaterfallFlyout } from './waterfall/waterfall_flyout';
import type { IWaterfall, IWaterfallItem } from './waterfall/waterfall_helpers/waterfall_helpers';
import { WaterfallLegends } from './waterfall_legends';

interface Props {
  waterfallItemId?: string;
  serviceName?: string;
  waterfall: IWaterfall;
  showCriticalPath: boolean;
  onShowCriticalPathChange: (showCriticalPath: boolean) => void;
}

const toggleFlyout = ({
  history,
  item,
  flyoutDetailTab,
}: {
  history: History;
  item?: IWaterfallItem;
  flyoutDetailTab?: string;
}) => {
  history.replace({
    ...history.location,
    search: fromQuery({
      ...toQuery(location.search),
      flyoutDetailTab,
      waterfallItemId: item?.id,
    }),
  });
};

export function WaterfallContainer({
  serviceName,
  waterfallItemId,
  waterfall,
  showCriticalPath,
  onShowCriticalPathChange,
}: Props) {
  const history = useHistory();

  if (!waterfall) {
    return null;
  }
  const { legends, colorBy, orphanTraceItemsCount } = waterfall;

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiSwitch
          id="showCriticalPath"
          label={i18n.translate('xpack.apm.waterfall.showCriticalPath', {
            defaultMessage: 'Show critical path',
          })}
          checked={showCriticalPath}
          onChange={(event) => {
            onShowCriticalPathChange(event.target.checked);
          }}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <WaterfallLegends serviceName={serviceName} legends={legends} type={colorBy} />
          </EuiFlexItem>
          {orphanTraceItemsCount > 0 ? (
            <EuiFlexItem grow={false}>
              <OrphanTraceItemsWarning orphanTraceItemsCount={orphanTraceItemsCount} />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <Waterfall
          showCriticalPath={showCriticalPath}
          waterfallItemId={waterfallItemId}
          waterfall={waterfall}
          onNodeClick={(item: IWaterfallItem, flyoutDetailTab: string) =>
            toggleFlyout({ history, item, flyoutDetailTab })
          }
        />
      </EuiFlexItem>

      <WaterfallFlyout
        waterfallItemId={waterfallItemId}
        waterfall={waterfall}
        toggleFlyout={toggleFlyout}
      />
    </EuiFlexGroup>
  );
}
