/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButtonEmpty, EuiContextMenu, EuiFlexItem, EuiPopover, EuiIcon } from '@elastic/eui';
import { useDispatch } from 'react-redux';

import { IIndexPattern } from '../../../../../../../../src/plugins/data/public';
import { TimelineType } from '../../../../../common/types/timeline';
import { BrowserFields } from '../../../../common/containers/source';
import { StatefulEditDataProvider } from '../../edit_data_provider';
import { addContentToTimeline } from './helpers';
import { DataProvider, DataProviderType } from './data_provider';

const AddDataProviderPopoverComponent: React.FC<{
  dataProviders: DataProvider[];
  indexPattern: IIndexPattern;
  timelineId: string;
  browserFields: BrowserFields;
  timelineType: TimelineType;
}> = ({ dataProviders, indexPattern, timelineId, browserFields, timelineType }) => {
  const dispatch = useDispatch();
  const [isAddFilterPopoverOpen, setIsAddFilterPopoverOpen] = useState(false);

  if (!indexPattern) return <></>;

  const button = (
    <EuiButtonEmpty
      size="xs"
      onClick={() => setIsAddFilterPopoverOpen(true)}
      data-test-subj="addFilter"
      className="globalFilterBar__addButton"
    >
      {'+ '}
      <FormattedMessage
        id="data.filter.filterBar.addFilterButtonLabel"
        defaultMessage="Add filter"
      />
    </EuiButtonEmpty>
  );

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
          onDataProviderEdited={({
            andProviderId,
            excluded,
            field,
            id,
            operator,
            providerId,
            value,
            type,
          }) => {
            addContentToTimeline({
              dataProviders,
              destination: {
                droppableId: `droppableId.timelineProviders.${timelineId}.group.${dataProviders.length}`,
                index: 0,
              },
              dispatch,
              onAddedToTimeline: () => setIsAddFilterPopoverOpen(false),
              providerToAdd: {
                id,
                name,
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
          }}
          operator=":"
          providerId="providerId"
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
          onDataProviderEdited={({
            andProviderId,
            excluded,
            field,
            id,
            operator,
            providerId,
            value,
            type,
          }) => {
            addContentToTimeline({
              dataProviders,
              destination: {
                droppableId: `droppableId.timelineProviders.${timelineId}.group.${dataProviders.length}`,
                index: 0,
              },
              dispatch,
              onAddedToTimeline: () => setIsAddFilterPopoverOpen(false),
              providerToAdd: {
                id,
                name,
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
          }}
          operator=":"
          providerId="providerId"
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
        button={button}
        isOpen={isAddFilterPopoverOpen}
        closePopover={() => setIsAddFilterPopoverOpen(false)}
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
