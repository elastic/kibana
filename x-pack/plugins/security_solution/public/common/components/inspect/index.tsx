/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
import React from 'react';

import { InputsModelId } from '../../store/inputs/constants';

import { HoverVisibilityContainer } from '../hover_visibility_container';

import { ModalInspectQuery } from './modal';
import { useInspect } from './use_inspect';
import * as i18n from './translations';

export const BUTTON_CLASS = 'inspectButtonComponent';

interface InspectButtonContainerProps {
  show?: boolean;
  children: React.ReactNode;
}

export const InspectButtonContainer: React.FC<InspectButtonContainerProps> = ({
  children,
  show = true,
}) => (
  <HoverVisibilityContainer show={show} targetClassNames={[BUTTON_CLASS]}>
    {children}
  </HoverVisibilityContainer>
);

interface InspectButtonProps {
  compact?: boolean;
  inputId?: InputsModelId;
  inspectIndex?: number;
  isDisabled?: boolean;
  multiple?: boolean;
  onCloseInspect?: () => void;
  queryId: string;
  title: string | React.ReactElement | React.ReactNode;
}

const InspectButtonComponent: React.FC<InspectButtonProps> = ({
  compact = false,
  inputId = 'global',
  inspectIndex = 0,
  isDisabled,
  multiple = false, // If multiple = true we ignore the inspectIndex and pass all requests and responses to the inspect modal
  onCloseInspect,
  queryId = '',
  title = '',
}) => {
  const {
    additionalRequests,
    additionalResponses,
    handleClick,
    handleCloseModal,
    isButtonDisabled,
    isShowingModal,
    loading,
    request,
    response,
  } = useInspect({
    inputId,
    inspectIndex,
    isDisabled,
    multiple,
    onCloseInspect,
    queryId,
  });

  return (
    <>
      {inputId === 'timeline' && !compact && (
        <EuiButtonEmpty
          className={BUTTON_CLASS}
          aria-label={i18n.INSPECT}
          data-test-subj="inspect-empty-button"
          color="text"
          iconSide="left"
          iconType="inspect"
          isDisabled={isButtonDisabled}
          isLoading={loading}
          onClick={handleClick}
        >
          {i18n.INSPECT}
        </EuiButtonEmpty>
      )}
      {(inputId === 'global' || compact) && (
        <EuiButtonIcon
          className={BUTTON_CLASS}
          aria-label={i18n.INSPECT}
          data-test-subj="inspect-icon-button"
          iconSize="m"
          iconType="inspect"
          isDisabled={isButtonDisabled}
          title={i18n.INSPECT}
          onClick={handleClick}
        />
      )}
      {isShowingModal && request !== null && response !== null && (
        <ModalInspectQuery
          additionalRequests={additionalRequests}
          additionalResponses={additionalResponses}
          closeModal={handleCloseModal}
          data-test-subj="inspect-modal"
          inputId={inputId}
          request={request}
          response={response}
          title={title}
        />
      )}
    </>
  );
};

InspectButtonComponent.displayName = 'InspectButtonComponent';
export const InspectButton = React.memo(InspectButtonComponent);
