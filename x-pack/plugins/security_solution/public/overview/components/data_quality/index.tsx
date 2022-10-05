/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useMemo, useState } from 'react';

import { Body } from './data_quality_panel/body';
import { Header } from './data_quality_panel/header';
import { PanelSubtitle } from './data_quality_panel/panel_subtitle';
import * as i18n from './translations';
import { useEcsMetadata } from './use_ecs_metadata';
import { useEcsVersion } from './use_ecs_version';

interface Props {
  patterns: string[];
  title?: string;
}

const DataQualityPanelComponent: React.FC<Props> = ({
  patterns,
  title = i18n.DEFAULT_PANEL_TITLE,
}) => {
  const { ecsMetadata, error, loading } = useEcsMetadata();
  const { loading: versionLoading, version } = useEcsVersion();
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const subtitle = useMemo(
    () => (
      <PanelSubtitle
        error={error}
        loading={loading}
        version={version}
        versionLoading={versionLoading}
      />
    ),
    [error, loading, version, versionLoading]
  );

  return (
    <EuiPanel data-test-subj="data-quality-panel" hasBorder>
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem grow={false}>
          <Header
            collapsed={collapsed}
            patterns={patterns}
            setCollapsed={setCollapsed}
            subtitle={subtitle}
            title={title}
          />
        </EuiFlexItem>

        {!collapsed && (
          <EuiFlexItem grow={false}>
            <Body
              ecsMetadata={ecsMetadata}
              error={error}
              loading={loading}
              patterns={patterns}
              version={version}
              versionLoading={versionLoading}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

DataQualityPanelComponent.displayName = 'DataQualityPanelComponent';

export const DataQualityPanel = React.memo(DataQualityPanelComponent);
