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
import React, { useState } from 'react';
import styled from 'styled-components';
import { LensEmbeddableInput, TypedLensByValueInput } from '../../../../../lens/public';
import { useKibana } from '../../lib/kibana/kibana_react';

import { InputsModelId } from '../../store/inputs/constants';
import { ModalInspectQuery } from '../inspect/modal';
import { useInspect } from '../inspect/use_inspect';
import { useLensAttributes } from './use_lens_attributes';

export type LensAttributes = TypedLensByValueInput['attributes'];

export interface HistogramActionsProps {
  className?: string;
  getLensAttributes?: (stackByField?: string) => LensAttributes;
  inputId?: InputsModelId;
  inspectIndex?: number;
  isInspectButtonDisabled?: boolean;
  isMultipleQuery?: boolean;
  lensAttributes: LensAttributes;
  onCloseInspect?: () => void;
  queryId: string;
  timerange: { from: string; to: string };
  title: React.ReactNode;
  stackByField?: string;
}

const StyledEuiPopover = styled(EuiPopover)`
  &.kpi-matrix-histogram-actions {
    position: absolute;
    top: 0;
    right: 0;
  }
`;

export const HISTOGRAM_ACTIONS_BUTTON_CLASS = 'histogram-actions-trigger';

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
  const { lens } = useKibana<StartServices>().services;
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
    queryId,
  });

  const lensAttrsWithInjectedData = useLensAttributes({
    lensAttributes,
    getLensAttributes,
    stackByField,
  });

  const items = [
    <EuiContextMenuItem
      icon="visArea"
      key="openInLens"
      disabled={!canUseEditor()}
      onClick={() => {
        closePopover();
        navigateToPrefilledEditor(
          {
            id: '',
            timeRange: timerange,
            attributes: lensAttrsWithInjectedData,
          },
          {
            openInNewTab: true,
          }
        );
      }}
    >
      <FormattedMessage
        id="xpack.securitySolution.histogramActions.openInLens"
        defaultMessage="Open in Lens"
      />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      icon="save"
      key="saveVisualization"
      onClick={() => {
        setIsSaveModalVisible(true);
        closePopover();
      }}
    >
      <FormattedMessage
        id="xpack.securitySolution.histogramActions.saveVisualization"
        defaultMessage="Save Visualization"
      />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      icon="search"
      key="Inspect"
      onClick={() => {
        handleInspectButtonClick();
        closePopover();
      }}
      disabled={queryId == null || disableInspectButton}
    >
      <FormattedMessage
        id="xpack.securitySolution.histogramActions.inspect"
        defaultMessage="Inspect"
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
    <>
      {isSaveModalVisible && (
        <LensSaveModalComponent
          initialInput={lensAttrsWithInjectedData as unknown as LensEmbeddableInput}
          onSave={() => {}}
          onClose={() => setIsSaveModalVisible(false)}
        />
      )}
      <StyledEuiPopover
        id={contextMenuPopoverId}
        button={button}
        isOpen={isPopoverOpen}
        className={className}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
        panelClassName="withHoverActions__popover"
      >
        <EuiContextMenuPanel data-test-subj="histogram-actions-panel" size="s" items={items} />
      </StyledEuiPopover>
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
    </>
  );
};
