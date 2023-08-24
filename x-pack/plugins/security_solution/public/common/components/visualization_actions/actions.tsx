/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonIcon, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import type { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public';

import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import type { LensEmbeddableInput } from '@kbn/lens-plugin/public';
import { InputsModelId } from '../../store/inputs/constants';
import { useKibana } from '../../lib/kibana/kibana_react';
import { ModalInspectQuery } from '../inspect/modal';

import { useInspect } from '../inspect/use_inspect';
import { useLensAttributes } from './use_lens_attributes';
import { useAddToExistingCase } from './use_add_to_existing_case';
import { useAddToNewCase } from './use_add_to_new_case';
import { useSaveToLibrary } from './use_save_to_library';
import type { VisualizationActionsProps } from './types';
import {
  ADD_TO_EXISTING_CASE,
  ADD_TO_NEW_CASE,
  INSPECT,
  MORE_ACTIONS,
  OPEN_IN_LENS,
  ADDED_TO_LIBRARY,
} from './translations';
import { VISUALIZATION_ACTIONS_BUTTON_CLASS } from './utils';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { useAppToasts } from '../../hooks/use_app_toasts';

const Wrapper = styled.div`
  &.viz-actions {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 1;
  }
  &.histogram-viz-actions {
    padding: ${({ theme }) => theme.eui.euiSizeS};
  }
`;

const VisualizationActionsComponent: React.FC<VisualizationActionsProps> = ({
  applyGlobalQueriesAndFilters = true,
  className,
  extraActions,
  extraOptions,
  getLensAttributes,
  inputId = InputsModelId.global,
  inspectIndex = 0,
  isInspectButtonDisabled,
  isMultipleQuery,
  lensAttributes,
  onCloseInspect,
  queryId,
  timerange,
  title: inspectTitle,
  scopeId = SourcererScopeName.default,
  stackByField,
  withDefaultActions = true,
}) => {
  const { lens } = useKibana().services;

  const { canUseEditor, navigateToPrefilledEditor, SaveModalComponent } = lens;
  const [isPopoverOpen, setPopover] = useState(false);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const { addSuccess } = useAppToasts();
  const hasPermission = canUseEditor();

  const onButtonClick = useCallback(() => {
    setPopover(!isPopoverOpen);
  }, [isPopoverOpen]);

  const closePopover = () => {
    setPopover(false);
  };

  const attributes = useLensAttributes({
    applyGlobalQueriesAndFilters,
    extraOptions,
    getLensAttributes,
    lensAttributes,
    scopeId,
    stackByField,
    title: '',
  });

  const dataTestSubj = `stat-${queryId}`;

  const { disabled: isAddToExistingCaseDisabled, onAddToExistingCaseClicked } =
    useAddToExistingCase({
      onAddToCaseClicked: closePopover,
      lensAttributes: attributes,
      timeRange: timerange,
    });

  const { onAddToNewCaseClicked, disabled: isAddToNewCaseDisabled } = useAddToNewCase({
    onClick: closePopover,
    timeRange: timerange,
    lensAttributes: attributes,
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

  const { openSaveVisualizationFlyout, disableVisualizations } = useSaveToLibrary({
    attributes,
  });

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

  const items = useMemo(() => {
    const context = {} as ActionExecutionContext<object>;
    const extraActionsItems =
      extraActions?.map((item: Action) => {
        return (
          <EuiContextMenuItem
            icon={item?.getIconType(context)}
            key={item.id}
            onClick={() => item.execute(context)}
            data-test-subj={`viz-actions-${item.id}`}
          >
            {item.getDisplayName(context)}
          </EuiContextMenuItem>
        );
      }) ?? [];
    return [
      ...(extraActionsItems ? extraActionsItems : []),
      ...(withDefaultActions
        ? [
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
            ...(hasPermission
              ? [
                  <EuiContextMenuItem
                    icon="visArea"
                    key="visualizationActionsSaveVisualization"
                    data-test-subj="viz-actions-save-visualization"
                    disabled={disableVisualizations}
                    onClick={openSaveVisualizationFlyout}
                  >
                    {ADDED_TO_LIBRARY}
                  </EuiContextMenuItem>,
                ]
              : []),
            <EuiContextMenuItem
              icon="visArea"
              key="visualizationActionsOpenInLens"
              data-test-subj="viz-actions-open-in-lens"
              disabled={disableVisualizations}
              onClick={onOpenInLens}
            >
              {OPEN_IN_LENS}
            </EuiContextMenuItem>,
          ]
        : []),
    ];
  }, [
    hasPermission,
    disableInspectButton,
    disableVisualizations,
    extraActions,
    handleInspectButtonClick,
    isAddToExistingCaseDisabled,
    isAddToNewCaseDisabled,
    onAddToExistingCaseClicked,
    onAddToNewCaseClicked,
    onOpenInLens,
    openSaveVisualizationFlyout,
    withDefaultActions,
  ]);

  const button = useMemo(
    () => (
      <EuiButtonIcon
        aria-label={MORE_ACTIONS}
        className={VISUALIZATION_ACTIONS_BUTTON_CLASS}
        data-test-subj={dataTestSubj}
        iconType="boxesHorizontal"
        onClick={onButtonClick}
      />
    ),
    [dataTestSubj, onButtonClick]
  );

  return (
    <Wrapper className={className}>
      {items.length > 0 && (
        <EuiPopover
          button={button}
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          panelPaddingSize="none"
          anchorPosition="downLeft"
          panelClassName="withHoverActions__popover"
          data-test-subj="viz-actions-popover"
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
          title={inspectTitle}
        />
      )}
      {isSaveModalVisible && hasPermission && (
        <SaveModalComponent
          initialInput={attributes as unknown as LensEmbeddableInput}
          onSave={() => {
            setIsSaveModalVisible(false);
            addSuccess(ADDED_TO_LIBRARY);
          }}
          onClose={() => setIsSaveModalVisible(false)}
        />
      )}
    </Wrapper>
  );
};

VisualizationActionsComponent.displayName = 'VisualizationActionsComponent';
export const VisualizationActions = React.memo(VisualizationActionsComponent);
