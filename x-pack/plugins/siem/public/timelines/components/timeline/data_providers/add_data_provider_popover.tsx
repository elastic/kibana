/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState } from 'react';
import { EuiContextMenu, EuiFlexItem, EuiPopover, EuiIcon } from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';

import { TimelineType } from '../../../../../common/types/timeline';
import { useWithSource } from '../../../../common/containers/source';
import { StatefulEditDataProvider } from '../../edit_data_provider';
import { addContentToTimeline } from './helpers';
import { DataProviderType } from './data_provider';
import { timelineSelectors } from '../../../store/timeline';

const AddDataProviderPopoverComponent: React.FC<{
  timelineId: string;
  Button: React.ComponentType<{ onClick: () => void }>;
}> = ({ Button, timelineId }) => {
  const dispatch = useDispatch();
  const [isAddFilterPopoverOpen, setIsAddFilterPopoverOpen] = useState(false);
  const timelineById = useSelector(timelineSelectors.timelineByIdSelector);
  const { dataProviders, timelineType } = timelineById[timelineId] ?? {};
  const { indexPattern, browserFields } = useWithSource('default');

  const handleOpenPopover = useCallback(() => setIsAddFilterPopoverOpen(true), [
    setIsAddFilterPopoverOpen,
  ]);

  const handleClosePopover = useCallback(() => setIsAddFilterPopoverOpen(false), [
    setIsAddFilterPopoverOpen,
  ]);

  const handleDataProviderEdited = useCallback(
    ({ andProviderId, excluded, field, id, operator, providerId, value, type }) => {
      addContentToTimeline({
        dataProviders,
        destination: {
          droppableId: `droppableId.timelineProviders.${timelineId}.group.${dataProviders.length}`,
          index: 0,
        },
        dispatch,
        onAddedToTimeline: handleClosePopover,
        providerToAdd: {
          id: providerId,
          name: value,
          enabled: true,
          excluded,
          kqlQuery: '',
          type,
          queryMatch: {
            displayField: undefined,
            displayValue: undefined,
            field,
            value,
            operator,
          },
          and: [],
        },
        timelineId,
      });
    },
    [timelineId, dataProviders]
  );

  if (!indexPattern || !browserFields) return <></>;

  const panels = [
    {
      id: 0,
      items: [
        {
          name: 'Add Field',
          icon: <EuiIcon type="search" size="m" />,
          panel: 1,
        },
        {
          disabled: timelineType !== TimelineType.template,
          name: 'Add Template Field',
          icon: <EuiIcon type="search" size="m" />,
          panel: 2,
        },
      ],
    },
    {
      id: 1,
      title: 'Add Field',
      width: 400,
      content: (
        <StatefulEditDataProvider
          browserFields={browserFields}
          field=""
          isExcluded={false}
          onDataProviderEdited={handleDataProviderEdited}
          operator=":"
          timelineId={timelineId}
          value=""
          type={DataProviderType.default}
        />
      ),
    },
    {
      id: 2,
      title: 'Add Template Field',
      width: 400,
      content: (
        <StatefulEditDataProvider
          browserFields={browserFields}
          field=""
          isExcluded={false}
          onDataProviderEdited={handleDataProviderEdited}
          operator=":"
          timelineId={timelineId}
          value=""
          type={DataProviderType.template}
        />
      ),
    },
  ];

  return (
    <EuiFlexItem grow={false}>
      <EuiPopover
        id="addFilterPopover"
        button={<Button onClick={handleOpenPopover} />}
        isOpen={isAddFilterPopoverOpen}
        closePopover={handleClosePopover}
        anchorPosition="downLeft"
        withTitle
        panelPaddingSize="none"
        ownFocus={true}
        initialFocus=".filterEditor__hiddenItem"
      >
        <EuiContextMenu initialPanelId={0} panels={panels} />
      </EuiPopover>
    </EuiFlexItem>
  );
};

export const AddDataProviderPopover = React.memo(AddDataProviderPopoverComponent);
