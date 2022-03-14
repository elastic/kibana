/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonIcon, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import { useKibana } from '../../lib/kibana/kibana_react';
import { ModalInspectQuery } from '../inspect/modal';

import { useInspect } from '../inspect/use_inspect';
import { useLensAttributes } from './use_lens_attributes';
import { useAddToExistingCase } from './use_add_to_existing_case';
import { useGetUserCasesPermissions } from '../../lib/kibana';
import { useAddToNewCase } from './use_add_to_new_case';
import { VisualizationActionsProps } from './types';
import {
  ADD_TO_EXISTING_CASE,
  ADD_TO_NEW_CASE,
  INSPECT,
  MORE_ACTIONS,
  OPEN_IN_LENS,
} from './translations';

const Wrapper = styled.div`
  &.viz-actions {
    position: absolute;
    top: 0;
    right: 0;
  }
  &.histogram-viz-actions {
    padding: ${({ theme }) => theme.eui.paddingSizes.s};
  }
`;

export const HISTOGRAM_ACTIONS_BUTTON_CLASS = 'histogram-actions-trigger';

const VisualizationActionsComponent: React.FC<VisualizationActionsProps> = ({
  className,
  getLensAttributes,
  inputId = 'global',
  inspectIndex = 0,
  isInspectButtonDisabled,
  isMultipleQuery,
  lensAttributes,
  onCloseInspect,
  queryId,
  timerange,
  title,
  stackByField,
}) => {
  const { lens } = useKibana().services;
  const userPermissions = useGetUserCasesPermissions();
  const userCanCrud = userPermissions?.crud ?? false;

  const { canUseEditor, navigateToPrefilledEditor } = lens;
  const [isPopoverOpen, setPopover] = useState(false);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);

  const onButtonClick = useCallback(() => {
    setPopover(!isPopoverOpen);
  }, [isPopoverOpen]);

  const closePopover = () => {
    setPopover(false);
  };

  const attributes = useLensAttributes({
    lensAttributes,
    getLensAttributes,
    stackByField,
  });

  const dataTestSubj = `stat-${queryId}`;

  const { disabled: isAddToExistingCaseDisabled, onAddToExistingCaseClicked } =
    useAddToExistingCase({
      onAddToCaseClicked: closePopover,
      lensAttributes: attributes,
      timeRange: timerange,
      userCanCrud,
    });

  const { onAddToNewCaseClicked, disabled: isAddToNewCaseDisabled } = useAddToNewCase({
    onClick: closePopover,
    timeRange: timerange,
    lensAttributes: attributes,
    userCanCrud,
  });

  const onOpenInLens = useCallback(() => {
    closePopover();
    if (!timerange || !attributes) {
      return;
    }
    navigateToPrefilledEditor(
      {
        id: '',
        timeRange: timerange,
        attributes,
      },
      {
        openInNewTab: true,
      }
    );
  }, [attributes, navigateToPrefilledEditor, timerange]);

  const onOpenInspectModal = useCallback(() => {
    closePopover();
    setIsInspectModalOpen(true);
  }, []);

  const onCloseInspectModal = useCallback(() => {
    setIsInspectModalOpen(false);
    if (onCloseInspect) {
      onCloseInspect();
    }
  }, [onCloseInspect]);

  const {
    additionalRequests,
    additionalResponses,
    handleClick: handleInspectButtonClick,
    handleCloseModal: handleCloseInspectModal,
    isButtonDisabled: disableInspectButton,
    request,
    response,
  } = useInspect({
    inputId,
    inspectIndex,
    isDisabled: isInspectButtonDisabled,
    multiple: isMultipleQuery,
    onCloseInspect: onCloseInspectModal,
    onClick: onOpenInspectModal,
    queryId,
  });

  const disabledOpenInLens = useMemo(
    () => !canUseEditor() || attributes == null,
    [attributes, canUseEditor]
  );

  const items = useMemo(
    () => [
      <EuiContextMenuItem
        icon="inspect"
        key="visualizationActionsInspect"
        onClick={handleInspectButtonClick}
        disabled={disableInspectButton}
        data-test-subj="viz-actions-inspect"
      >
        {INSPECT}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        icon="visArea"
        key="visualizationActionsOpenInLens"
        data-test-subj="viz-actions-open-in-lens"
        disabled={disabledOpenInLens}
        onClick={onOpenInLens}
      >
        {OPEN_IN_LENS}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        disabled={isAddToNewCaseDisabled}
        icon="plusInCircle"
        key="visualizationActionsAddToNewCase"
        onClick={onAddToNewCaseClicked}
        data-test-subj="viz-actions-add-to-new-case"
      >
        {ADD_TO_NEW_CASE}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        disabled={isAddToExistingCaseDisabled}
        data-test-subj="viz-actions-add-to-existing-case"
        icon="plusInCircle"
        key="visualizationActionsAddToExistingCase"
        onClick={onAddToExistingCaseClicked}
      >
        {ADD_TO_EXISTING_CASE}
      </EuiContextMenuItem>,
    ],
    [
      disableInspectButton,
      disabledOpenInLens,
      handleInspectButtonClick,
      isAddToExistingCaseDisabled,
      isAddToNewCaseDisabled,
      onAddToExistingCaseClicked,
      onAddToNewCaseClicked,
      onOpenInLens,
    ]
  );

  const button = useMemo(
    () => (
      <EuiButtonIcon
        aria-label={MORE_ACTIONS}
        className={HISTOGRAM_ACTIONS_BUTTON_CLASS}
        data-test-subj={dataTestSubj}
        iconType="boxesHorizontal"
        onClick={onButtonClick}
      />
    ),
    [dataTestSubj, onButtonClick]
  );

  return (
    <Wrapper className={className}>
      {request !== null && response !== null && (
        <EuiPopover
          button={button}
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          panelPaddingSize="none"
          anchorPosition="downLeft"
          panelClassName="withHoverActions__popover"
        >
          <EuiContextMenuPanel data-test-subj="viz-actions-panel" size="s" items={items} />
        </EuiPopover>
      )}
      {isInspectModalOpen && request !== null && response !== null && (
        <ModalInspectQuery
          additionalRequests={additionalRequests}
          additionalResponses={additionalResponses}
          closeModal={handleCloseInspectModal}
          inputId={inputId}
          request={request}
          response={response}
          title={title}
        />
      )}
    </Wrapper>
  );
};

VisualizationActionsComponent.displayName = 'VisualizationActionsComponent';
export const VisualizationActions = React.memo(VisualizationActionsComponent);
