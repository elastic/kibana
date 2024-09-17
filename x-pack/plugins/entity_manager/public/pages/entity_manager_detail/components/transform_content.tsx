/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TransformGetTransformStatsTransformStats,
  TransformGetTransformTransformSummary,
} from '@elastic/elasticsearch/lib/api/types';
import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCodeBlock, EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { TransformStatsPanel } from './transform_stats_panel';
import { TransformDetailsPanel } from './transform_details_panel';
import { TransformMessages } from './transform_messages';

interface TransformContentProps {
  transform: TransformGetTransformTransformSummary;
  stats: TransformGetTransformStatsTransformStats;
}

export function TransformContent({ transform, stats }: TransformContentProps) {
  const [selectedTabId, setSelectedTabId] = useState('details');

  const tabs = useMemo(
    () => [
      {
        id: 'details',
        name: i18n.translate('xpack.entityManager.transformContet.detailsTabLabel', {
          defaultMessage: 'Details',
        }),
        content: <TransformDetailsPanel stats={stats} transform={transform} />,
      },
      {
        id: 'stats',
        name: i18n.translate('xpack.entityManager.transformContet.statsTabLabel', {
          defaultMessage: 'Stats',
        }),
        content: (
          <>
            <EuiSpacer size="m" />
            <TransformStatsPanel stats={stats.stats} />
          </>
        ),
      },
      {
        id: 'json',
        name: i18n.translate('xpack.entityManager.transformContet.jsonTabLabel', {
          defaultMessage: 'JSON',
        }),
        content: (
          <EuiCodeBlock isCopyable language="json" overflowHeight={460}>
            {JSON.stringify(transform, null, 2)}
          </EuiCodeBlock>
        ),
      },
      {
        id: 'messages',
        name: i18n.translate('xpack.entityManager.transformContet.messagesTabLabel', {
          defaultMessage: 'Messages',
        }),
        content: <TransformMessages transform={transform} />,
      },
    ],
    [stats, transform]
  );

  const selectedTabContent = useMemo(() => {
    return tabs.find((obj) => obj.id === selectedTabId)?.content;
  }, [selectedTabId, tabs]);

  const onSelectedTabChanged = (id: string) => {
    setSelectedTabId(id);
  };

  const renderTabs = () => {
    return tabs.map((tab, index) => (
      <EuiTab
        key={index}
        onClick={() => onSelectedTabChanged(tab.id)}
        isSelected={tab.id === selectedTabId}
      >
        {tab.name}
      </EuiTab>
    ));
  };

  return (
    <>
      <EuiTabs size="s">{renderTabs()}</EuiTabs>
      {selectedTabContent}
    </>
  );
}
