/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { RefObject, useEffect, useState } from 'react';

import { EuiTabs, EuiTab, EuiButtonIcon } from '@elastic/eui';
import { useHistory, useParams } from 'react-router-dom';
import { SeriesEditor } from '../series_editor/series_editor';
import { SeriesViewer } from '../series_viewer/series_viewer';
import { TypedLensByValueInput } from '../../../../../../lens/public';

const tabs = [
  {
    id: 'preview',
    name: 'Preview',
  },
  {
    id: 'configure',
    name: 'Configure series',
  },
];

type ViewTab = 'preview' | 'configure';

export function SeriesViews({
  seriesBuilderRef,
  onSeriesPanelCollapse,
  lensAttributes,
}: {
  seriesBuilderRef: RefObject<HTMLDivElement>;
  lensAttributes: TypedLensByValueInput['attributes'] | null;
}) {
  const { mode } = useParams<{ mode: ViewTab }>();

  const history = useHistory();

  const [selectedTabId, setSelectedTabId] = useState('cobalt');

  const onSelectedTabChanged = (id: string) => {
    setSelectedTabId(id);
    history.push('/exploratory-view/' + id);
  };

  useEffect(() => {
    setSelectedTabId(mode);
  }, [mode]);

  const renderTabs = () => {
    return tabs.map((tab, index) => (
      <EuiTab
        {...(tab.href && { href: tab.href, target: '_blank' })}
        onClick={() => onSelectedTabChanged(tab.id)}
        isSelected={tab.id === selectedTabId}
        key={index}
      >
        {tab.id === 'preview' && selectedTabId === 'preview' ? (
          <span>
            <EuiButtonIcon
              iconType="arrowDown"
              onClick={() => onSeriesPanelCollapse('seriesPanel')}
            />
            &nbsp;{tab.name}
          </span>
        ) : (
          tab.name
        )}
      </EuiTab>
    ));
  };

  return (
    <div ref={seriesBuilderRef}>
      <EuiTabs size="s">{renderTabs()}</EuiTabs>
      {selectedTabId === 'preview' && <SeriesViewer />}
      {selectedTabId === 'configure' && <SeriesEditor />}
    </div>
  );
}
