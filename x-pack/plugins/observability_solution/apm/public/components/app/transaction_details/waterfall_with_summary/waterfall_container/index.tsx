/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { History } from 'history';
import { useHistory } from 'react-router-dom';
import { useCriticalPathFeatureEnabledSetting } from '../../../../../hooks/use_critical_path_feature_enabled_setting';
import { TechnicalPreviewBadge } from '../../../../shared/technical_preview_badge';
import type { IWaterfall, IWaterfallItem } from './waterfall/waterfall_helpers/waterfall_helpers';
import { fromQuery, toQuery } from '../../../../shared/links/url_helpers';
import { WaterfallFlyout } from './waterfall/waterfall_flyout';
import { WaterfallContent } from './waterfall_content';

interface Props {
  waterfallItemId?: string;
  serviceName?: string;
  waterfall: IWaterfall;
  showCriticalPath: boolean;
  scrollElement?: React.RefObject<HTMLDivElement>;
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
  scrollElement,
  onShowCriticalPathChange,
}: Props) {
  const history = useHistory();

  const isCriticalPathFeatureEnabled = useCriticalPathFeatureEnabledSetting();

  if (!waterfall) {
    return null;
  }

  return (
    <>
      <EuiFlexGroup direction="column">
        {isCriticalPathFeatureEnabled ? (
          <EuiFlexItem>
            <EuiSwitch
              id="showCriticalPath"
              label={
                <EuiFlexGroup gutterSize="s">
                  <EuiFlexItem grow={false}>
                    {i18n.translate('xpack.apm.waterfall.showCriticalPath', {
                      defaultMessage: 'Show critical path',
                    })}
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <TechnicalPreviewBadge icon="beaker" />
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              checked={showCriticalPath}
              onChange={(event) => {
                onShowCriticalPathChange(event.target.checked);
              }}
            />
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem>
          <WaterfallContent
            showCriticalPath={showCriticalPath}
            waterfall={waterfall}
            scrollElement={scrollElement}
            onClickWaterfallItem={(item, flyoutDetailTab) => {
              toggleFlyout({ history, item, flyoutDetailTab });
            }}
            serviceName={serviceName}
            waterfallItemId={waterfallItemId}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <WaterfallFlyout
        waterfallItemId={waterfallItemId}
        waterfall={waterfall}
        toggleFlyout={toggleFlyout}
      />
    </>
  );
}
