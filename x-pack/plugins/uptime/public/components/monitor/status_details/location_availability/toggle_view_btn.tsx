/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import styled from 'styled-components';
import { EuiButtonGroup } from '@elastic/eui';
import { useSelectedView } from './use_selected_view';
import { ChangeToListView, ChangeToMapView } from '../translations';

const ToggleViewButtons = styled.span`
  margin-left: auto;
`;

interface Props {
  onChange: (val: string) => void;
}

export const ToggleViewBtn = ({ onChange }: Props) => {
  const toggleButtons = [
    {
      id: `listBtn`,
      label: ChangeToMapView,
      name: 'listView',
      iconType: 'list',
      'data-test-subj': 'uptimeMonitorToggleListBtn',
      'aria-label': ChangeToMapView,
    },
    {
      id: `mapBtn`,
      label: ChangeToListView,
      name: 'mapView',
      iconType: 'mapMarker',
      'data-test-subj': 'uptimeMonitorToggleMapBtn',
      'aria-label': ChangeToListView,
    },
  ];

  const { selectedView, setSelectedView } = useSelectedView();

  const onChangeView = (optionId: string) => {
    const currView = optionId === 'listBtn' ? 'list' : 'map';
    setSelectedView(currView);
    onChange(currView);
  };

  return (
    <ToggleViewButtons>
      <EuiButtonGroup
        options={toggleButtons}
        idToSelectedMap={{ listBtn: selectedView === 'list', mapBtn: selectedView === 'map' }}
        onChange={(id) => onChangeView(id)}
        type="multi"
        isIconOnly
        style={{ marginLeft: 'auto' }}
      />
    </ToggleViewButtons>
  );
};
