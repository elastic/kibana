/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';

import { EuiButtonIcon, EuiContextMenu, EuiPopover, EuiToolTip } from '@elastic/eui';
import styled from 'styled-components';
import { indexOf } from 'lodash';

import { ExceptionListType } from '@kbn/securitysolution-io-ts-list-types';
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
import { useEventFilterAction } from './use_event_filter_action';

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
    alertStatus,
    exceptionModalType,
    ruleId,
    ruleName,
    ruleIndices,
    onAddExceptionCancel,
    onAddExceptionConfirm,
    onAddExceptionTypeClick,
  } = useExceptionModal({
    ecsData: ecsRowData,
    refetch,
    timelineId,
  });

  const {
    closeAddEventFilterModal,
    isAddEventFilterModalOpen,
    onAddEventFilterClick,
  } = useEventFilterModal();

  const { statusActions } = useAlertsActions({
    ecsRowData,
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

  const isEvent = useMemo(() => indexOf(ecsRowData.event?.kind, 'event') !== -1, [ecsRowData]);

  const exceptionActions = useExceptionActions({
    ecsData: ecsRowData,
    onAddExceptionTypeClick: handleOnAddExceptionTypeClick,
  });

  const eventFilterActions = useEventFilterAction({
    onAddEventFilterClick: handleOnAddEventFilterClick,
  });

  const panels = useMemo(
    () => [
      {
        id: 0,
        items: !isEvent && ruleId ? [...statusActions, ...exceptionActions] : [eventFilterActions],
      },
    ],
    [eventFilterActions, exceptionActions, isEvent, ruleId, statusActions]
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
            <EuiContextMenu size="s" initialPanelId={0} panels={panels} />
          </EuiPopover>
        </EventsTdContent>
      </div>
      {exceptionModalType != null && ruleId != null && ecsRowData != null && (
        <AddExceptionModalWrapper
          ruleName={ruleName}
          ruleId={ruleId}
          ruleIndices={ruleIndices}
          exceptionListType={exceptionModalType}
          ecsData={ecsRowData}
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

const ContextMenuPanel = styled(EuiContextMenu)`
  font-size: ${({ theme }) => theme.eui.euiFontSizeS};
`;

ContextMenuPanel.displayName = 'ContextMenuPanel';

export const AlertContextMenu = React.memo(AlertContextMenuComponent);

type AddExceptionModalWrapperProps = Omit<
  AddExceptionModalProps,
  'alertData' | 'isAlertDataLoading'
> & {
  ecsData: Ecs;
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
  ecsData,
  onCancel,
  onConfirm,
  alertStatus,
  onRuleChange,
}) => {
  const { loading: isSignalIndexLoading, signalIndexName } = useSignalIndex();

  const { loading: isLoadingAlertData, data } = useQueryAlerts<EcsHit, {}>({
    query: buildGetAlertByIdQuery(ecsData?._id),
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
