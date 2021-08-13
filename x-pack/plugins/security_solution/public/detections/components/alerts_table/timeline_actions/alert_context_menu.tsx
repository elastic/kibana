/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';

import { EuiButtonIcon, EuiContextMenuPanel, EuiPopover, EuiToolTip } from '@elastic/eui';
import { indexOf } from 'lodash';

import { ExceptionListType } from '@kbn/securitysolution-io-ts-list-types';
import { get, getOr } from 'lodash/fp';
import { buildGetAlertByIdQuery } from '../../../../common/components/exceptions/helpers';
import { EventsTdContent } from '../../../../timelines/components/timeline/styles';
import { DEFAULT_ICON_BUTTON_WIDTH } from '../../../../timelines/components/timeline/helpers';
import { Ecs } from '../../../../../common/ecs';
import {
  AddExceptionModal,
  AddExceptionModalProps,
} from '../../../../common/components/exceptions/add_exception_modal';
import * as i18n from '../translations';
import { inputsModel } from '../../../../common/store';
import { AlertData, EcsHit } from '../../../../common/components/exceptions/types';
import { useQueryAlerts } from '../../../containers/detection_engine/alerts/use_query';
import { useSignalIndex } from '../../../containers/detection_engine/alerts/use_signal_index';
import { EventFiltersModal } from '../../../../management/pages/event_filters/view/components/modal';
import { useAlertsActions } from './use_alerts_actions';
import { useExceptionModal } from './use_add_exception_modal';
import { useExceptionActions } from './use_add_exception_actions';
import { useEventFilterModal } from './use_event_filter_modal';
import { Status } from '../../../../../common/detection_engine/schemas/common/schemas';
import { AddEventFilter } from './add_event_filter';
import { AddException } from './add_exception';
import { AddEndpointException } from './add_endpoint_exception';

interface AlertContextMenuProps {
  ariaLabel?: string;
  disabled: boolean;
  ecsRowData: Ecs;
  refetch: inputsModel.Refetch;
  onRuleChange?: () => void;
  timelineId: string;
}

const AlertContextMenuComponent: React.FC<AlertContextMenuProps> = ({
  ariaLabel = i18n.MORE_ACTIONS,
  disabled,
  ecsRowData,
  refetch,
  onRuleChange,
  timelineId,
}) => {
  const [isPopoverOpen, setPopover] = useState(false);
  const ruleId = get(0, ecsRowData?.signal?.rule?.id);
  const ruleName = get(0, ecsRowData?.signal?.rule?.name);

  const alertStatus = get(0, ecsRowData?.signal?.status) as Status;

  const isEvent = useMemo(() => indexOf(ecsRowData.event?.kind, 'event') !== -1, [ecsRowData]);

  const isEndpointAlert = useMemo((): boolean => {
    if (ecsRowData == null) {
      return false;
    }

    const eventModules = getOr([], 'signal.original_event.module', ecsRowData);
    const kinds = getOr([], 'signal.original_event.kind', ecsRowData);

    return eventModules.includes('endpoint') && kinds.includes('alert');
  }, [ecsRowData]);

  const onButtonClick = useCallback(() => {
    setPopover(!isPopoverOpen);
  }, [isPopoverOpen]);

  const closePopover = useCallback((): void => {
    setPopover(false);
  }, []);

  const button = useMemo(() => {
    return (
      <EuiToolTip position="top" content={i18n.MORE_ACTIONS}>
        <EuiButtonIcon
          aria-label={ariaLabel}
          data-test-subj="timeline-context-menu-button"
          size="s"
          iconType="boxesHorizontal"
          onClick={onButtonClick}
          isDisabled={disabled}
        />
      </EuiToolTip>
    );
  }, [disabled, onButtonClick, ariaLabel]);

  const {
    exceptionModalType,
    onAddExceptionCancel,
    onAddExceptionConfirm,
    onAddExceptionTypeClick,
    ruleIndices,
  } = useExceptionModal({
    ruleIndex: ecsRowData?.signal?.rule?.index,
    refetch,
    timelineId,
  });

  const {
    closeAddEventFilterModal,
    isAddEventFilterModalOpen,
    onAddEventFilterClick,
  } = useEventFilterModal();

  const { actionItems } = useAlertsActions({
    alertStatus,
    eventId: ecsRowData?._id,
    indexName: ecsRowData?._index ?? '',
    timelineId,
    closePopover,
  });

  const handleOnAddExceptionTypeClick = useCallback(
    (type: ExceptionListType) => {
      onAddExceptionTypeClick(type);
      closePopover();
    },
    [closePopover, onAddExceptionTypeClick]
  );

  const handleOnAddEventFilterClick = useCallback(() => {
    onAddEventFilterClick();
    closePopover();
  }, [closePopover, onAddEventFilterClick]);

  const {
    disabledAddEndpointException,
    disabledAddException,
    handleEndpointExceptionModal,
    handleDetectionExceptionModal,
  } = useExceptionActions({
    isEndpointAlert,
    onAddExceptionTypeClick: handleOnAddExceptionTypeClick,
  });

  const items = useMemo(
    () =>
      !isEvent && ruleId
        ? [
            ...actionItems,
            <AddEndpointException
              onClick={handleEndpointExceptionModal}
              disabled={disabledAddEndpointException}
            />,
            <AddException
              onClick={handleDetectionExceptionModal}
              disabled={disabledAddException}
            />,
          ]
        : [<AddEventFilter onClick={handleOnAddEventFilterClick} />],
    [
      actionItems,
      disabledAddEndpointException,
      disabledAddException,
      handleDetectionExceptionModal,
      handleEndpointExceptionModal,
      handleOnAddEventFilterClick,
      isEvent,
      ruleId,
    ]
  );

  return (
    <>
      <div key="actions-context-menu">
        <EventsTdContent textAlign="center" width={DEFAULT_ICON_BUTTON_WIDTH}>
          <EuiPopover
            id="singlePanel"
            button={button}
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            panelPaddingSize="none"
            anchorPosition="downLeft"
            repositionOnScroll
          >
            <EuiContextMenuPanel size="s" items={items} />
          </EuiPopover>
        </EventsTdContent>
      </div>
      {exceptionModalType != null &&
        ruleId != null &&
        ruleName != null &&
        ecsRowData?._id != null && (
          <AddExceptionModalWrapper
            ruleName={ruleName}
            ruleId={ruleId}
            ruleIndices={ruleIndices}
            exceptionListType={exceptionModalType}
            eventId={ecsRowData?._id}
            onCancel={onAddExceptionCancel}
            onConfirm={onAddExceptionConfirm}
            alertStatus={alertStatus}
            onRuleChange={onRuleChange}
          />
        )}
      {isAddEventFilterModalOpen && ecsRowData != null && (
        <EventFiltersModal data={ecsRowData} onCancel={closeAddEventFilterModal} />
      )}
    </>
  );
};

export const AlertContextMenu = React.memo(AlertContextMenuComponent);

type AddExceptionModalWrapperProps = Omit<
  AddExceptionModalProps,
  'alertData' | 'isAlertDataLoading'
> & {
  eventId?: string;
};

/**
 * This component exists to fetch needed data outside of the AddExceptionModal
 * Due to the conditional nature of the modal and how we use the `ecsData` field,
 * we cannot use the fetch hook within the modal component itself
 */
export const AddExceptionModalWrapper: React.FC<AddExceptionModalWrapperProps> = ({
  ruleName,
  ruleId,
  ruleIndices,
  exceptionListType,
  eventId,
  onCancel,
  onConfirm,
  alertStatus,
  onRuleChange,
}) => {
  const { loading: isSignalIndexLoading, signalIndexName } = useSignalIndex();

  const { loading: isLoadingAlertData, data } = useQueryAlerts<EcsHit, {}>({
    query: buildGetAlertByIdQuery(eventId),
    indexName: signalIndexName,
  });

  const enrichedAlert: AlertData | undefined = useMemo(() => {
    if (isLoadingAlertData === false) {
      const hit = data?.hits.hits[0];
      if (!hit) {
        return undefined;
      }
      const { _id, _index, _source } = hit;
      return { ..._source, _id, _index };
    }
  }, [data?.hits.hits, isLoadingAlertData]);

  const isLoading = isLoadingAlertData && isSignalIndexLoading;

  return (
    <AddExceptionModal
      ruleName={ruleName}
      ruleId={ruleId}
      ruleIndices={ruleIndices}
      exceptionListType={exceptionListType}
      alertData={enrichedAlert}
      isAlertDataLoading={isLoading}
      onCancel={onCancel}
      onConfirm={onConfirm}
      alertStatus={alertStatus}
      onRuleChange={onRuleChange}
    />
  );
};
