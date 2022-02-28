/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import {
  GetAllCasesSelectorModalProps,
  GetCreateCaseFlyoutProps,
} from '../../../../../cases/public';
import { LensEmbeddableInput } from '../../../../../lens/public';
import { APP_ID } from '../../../../common/constants';
import { useKibana } from '../../lib/kibana/kibana_react';
import { ModalInspectQuery } from '../inspect/modal';

import { useInspect } from '../inspect/use_inspect';
import { useLensAttributes } from './use_lens_attributes';
import { useAddToExistingCase } from './use_add_to_existing_case';
import { useGetUserCasesPermissions } from '../../lib/kibana';
import { useAddToNewCase } from './use_add_to_new_case';

const Wrapper = styled.div`
  &.kpi-matrix-histogram-actions {
    position: absolute;
    top: 0;
    right: 0;
  }
`;

export const HISTOGRAM_ACTIONS_BUTTON_CLASS = 'histogram-actions-trigger';

const owner = APP_ID;

export const HistogramActions = ({
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
}: HistogramActionsProps) => {
  const { lens, cases } = useKibana().services;
  const userPermissions = useGetUserCasesPermissions();
  const userCanCrud = userPermissions?.crud ?? false;

  const {
    canUseEditor,
    navigateToPrefilledEditor,
    SaveModalComponent: LensSaveModalComponent,
  } = lens;
  const [isPopoverOpen, setPopover] = useState(false);
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);

  const contextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'contextMenuPopover',
  });

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const attributes = useLensAttributes({
    lensAttributes,
    getLensAttributes,
    stackByField,
  });

  const {
    disabled: isAddToCaseDisabled,
    closeAllCaseModal,
    isAllCaseModalOpen,
    onCaseClicked,
    onAddToExistingCaseClicked,
  } = useAddToExistingCase({
    onAddToCaseClicked: closePopover,
    lensAttributes: attributes,
    timeRange: timerange,
    userCanCrud,
  });

  const {
    onClose: closeCreateCaseFlyout,
    onSuccess: onCreateCaseSuccess,
    attachments: chartAddedToCase,
    onAddToNewCaseClicked,
    isCreateCaseFlyoutOpen,
  } = useAddToNewCase({
    onClick: closePopover,
    timeRange: timerange,
    lensAttributes: attributes,
    userCanCrud,
  });

  const allCasesSelectorModalProps: GetAllCasesSelectorModalProps = {
    onRowClick: onCaseClicked,
    userCanCrud,
    owner: [owner],
    onClose: closeAllCaseModal,
  };

  const createCaseFlyoutProps: GetCreateCaseFlyoutProps = useMemo(() => {
    return {
      onClose: closeCreateCaseFlyout,
      onSuccess: onCreateCaseSuccess,
      owner: [owner],
      userCanCrud,
      attachments: chartAddedToCase,
    };
  }, [closeCreateCaseFlyout, onCreateCaseSuccess, userCanCrud, chartAddedToCase]);

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

  const closeSaveModalVisible = useCallback(() => {
    setIsSaveModalVisible(false);
  }, []);

  const onSaveVisualization = useCallback(() => {
    setIsSaveModalVisible(true);
    closePopover();
  }, []);

  const {
    additionalRequests,
    additionalResponses,
    handleClick: handleInspectButtonClick,
    handleCloseModal: handleCloseInspectModal,
    isButtonDisabled: disableInspectButton,
    isShowingModal,
    request,
    response,
  } = useInspect({
    inputId,
    inspectIndex,
    isDisabled: isInspectButtonDisabled,
    multiple: isMultipleQuery,
    onCloseInspect,
    onClick: closePopover,
    queryId,
  });

  const items = [
    <EuiContextMenuItem
      icon="visArea"
      key="histogramActionsOpenInLens"
      disabled={!canUseEditor() || attributes == null}
      onClick={onOpenInLens}
    >
      <FormattedMessage
        id="xpack.securitySolution.histogramActions.openInLens"
        defaultMessage="Open in Lens"
      />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      icon="save"
      key="histogramActionsSaveVisualization"
      disabled={!userCanCrud}
      onClick={onSaveVisualization}
    >
      <FormattedMessage
        id="xpack.securitySolution.histogramActions.saveVisualization"
        defaultMessage="Save Visualization"
      />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      icon="search"
      key="histogramActionsInspect"
      onClick={handleInspectButtonClick}
      disabled={disableInspectButton}
    >
      <FormattedMessage
        id="xpack.securitySolution.histogramActions.inspect"
        defaultMessage="Inspect"
      />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      disabled={attributes == null || !userCanCrud}
      icon="plusInCircle"
      key="histogramActionsAddToNewCase"
      onClick={onAddToNewCaseClicked}
    >
      <FormattedMessage
        id="xpack.securitySolution.histogramActions.addToNewCase"
        defaultMessage="Add to new Case"
      />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      disabled={isAddToCaseDisabled}
      icon="plusInCircle"
      key="histogramActionsAddToExistingCase"
      onClick={onAddToExistingCaseClicked}
    >
      <FormattedMessage
        id="xpack.securitySolution.histogramActions.addToExistingCase"
        defaultMessage="Add to Existing Case"
      />
    </EuiContextMenuItem>,
  ];

  const button = (
    <EuiButtonIcon
      className={HISTOGRAM_ACTIONS_BUTTON_CLASS}
      iconType="boxesHorizontal"
      onClick={onButtonClick}
    />
  );

  return (
    <Wrapper className={className}>
      {isSaveModalVisible && (
        <LensSaveModalComponent
          initialInput={attributes as unknown as LensEmbeddableInput}
          onClose={closeSaveModalVisible}
        />
      )}
      <EuiPopover
        id={contextMenuPopoverId}
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
        panelClassName="withHoverActions__popover"
      >
        <EuiContextMenuPanel data-test-subj="histogram-actions-panel" size="s" items={items} />
      </EuiPopover>
      {isShowingModal && request !== null && response !== null && (
        <ModalInspectQuery
          additionalRequests={additionalRequests}
          additionalResponses={additionalResponses}
          closeModal={handleCloseInspectModal}
          data-test-subj="histogram-actions-inspect-modal"
          inputId={inputId}
          request={request}
          response={response}
          title={title}
        />
      )}
      {isCreateCaseFlyoutOpen && cases.getCreateCaseFlyout(createCaseFlyoutProps)}
      {isAllCaseModalOpen && cases.getAllCasesSelectorModal(allCasesSelectorModalProps)}
    </Wrapper>
  );
};
