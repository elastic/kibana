/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash/fp';
import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiContextMenu,
  EuiText,
  EuiPopover,
  EuiIcon,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import uuid from 'uuid';
import { useDispatch } from 'react-redux';

import { BrowserFields } from '../../../../common/containers/source';
import { TimelineType } from '../../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { StatefulEditDataProvider } from '../../edit_data_provider';
import { addContentToTimeline } from './helpers';
import { DataProviderType } from './data_provider';
import { timelineSelectors } from '../../../store/timeline';
import { ADD_FIELD_LABEL, ADD_TEMPLATE_FIELD_LABEL } from './translations';

interface AddDataProviderPopoverProps {
  browserFields: BrowserFields;
  timelineId: string;
}

const AddDataProviderPopoverComponent: React.FC<AddDataProviderPopoverProps> = ({
  browserFields,
  timelineId,
}) => {
  const dispatch = useDispatch();
  const [isAddFilterPopoverOpen, setIsAddFilterPopoverOpen] = useState(false);
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const { dataProviders, timelineType } = useDeepEqualSelector((state) =>
    pick(['dataProviders', 'timelineType'], getTimeline(state, timelineId))
  );

  const handleOpenPopover = useCallback(
    () => setIsAddFilterPopoverOpen(true),
    [setIsAddFilterPopoverOpen]
  );

  const handleClosePopover = useCallback(
    () => setIsAddFilterPopoverOpen(false),
    [setIsAddFilterPopoverOpen]
  );

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
    [dataProviders, timelineId, dispatch, handleClosePopover]
  );

  const panels = useMemo(
    () => [
      {
        id: 0,
        width: 400,
        items: [
          {
            name: ADD_FIELD_LABEL,
            icon: <EuiIcon type="plusInCircle" size="m" />,
            panel: 1,
          },
          timelineType === TimelineType.template
            ? {
                disabled: timelineType !== TimelineType.template,
                name: ADD_TEMPLATE_FIELD_LABEL,
                icon: <EuiIcon type="visText" size="m" />,
                panel: 2,
              }
            : null,
        ].filter((item) => item !== null) as EuiContextMenuPanelItemDescriptor[],
      },
      {
        id: 1,
        title: ADD_FIELD_LABEL,
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
            providerId={`${timelineId}-${uuid.v4()}`}
          />
        ),
      },
      {
        id: 2,
        title: ADD_TEMPLATE_FIELD_LABEL,
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
            providerId={`${timelineId}-${uuid.v4()}`}
          />
        ),
      },
    ],
    [browserFields, handleDataProviderEdited, timelineId, timelineType]
  );

  const button = useMemo(() => {
    if (timelineType === TimelineType.template) {
      return (
        <EuiButton
          size="s"
          onClick={handleOpenPopover}
          data-test-subj="addField"
          iconType="arrowDown"
          fill
          iconSide="right"
        >
          <EuiText size="s">{ADD_FIELD_LABEL}</EuiText>
        </EuiButton>
      );
    }

    return (
      <EuiButtonEmpty
        size="s"
        onClick={handleOpenPopover}
        data-test-subj="addField"
        iconSide="right"
      >
        <EuiText size="s">{`+ ${ADD_FIELD_LABEL}`}</EuiText>
      </EuiButtonEmpty>
    );
  }, [handleOpenPopover, timelineType]);

  const content = useMemo(() => {
    if (timelineType === TimelineType.template) {
      return <EuiContextMenu initialPanelId={0} panels={panels} />;
    }

    return (
      <StatefulEditDataProvider
        browserFields={browserFields}
        field=""
        isExcluded={false}
        onDataProviderEdited={handleDataProviderEdited}
        operator=":"
        timelineId={timelineId}
        value=""
        type={DataProviderType.default}
        providerId={`${timelineId}-${uuid.v4()}`}
      />
    );
  }, [browserFields, handleDataProviderEdited, panels, timelineId, timelineType]);

  return (
    <EuiPopover
      id="addFieldsPopover"
      button={button}
      isOpen={isAddFilterPopoverOpen}
      closePopover={handleClosePopover}
      anchorPosition="downLeft"
      panelPaddingSize="none"
      repositionOnScroll
    >
      {content}
    </EuiPopover>
  );
};

AddDataProviderPopoverComponent.displayName = 'AddDataProviderPopoverComponent';

export const AddDataProviderPopover = React.memo(AddDataProviderPopoverComponent);

AddDataProviderPopover.displayName = 'AddDataProviderPopover';
