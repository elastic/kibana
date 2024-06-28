/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon } from '@elastic/eui';
import React, { useState, memo, useCallback } from 'react';
import { GetInspectQuery } from '../../../../../../types';

import { HoverVisibilityContainer } from './hover_visibility_container';

import { ModalInspectQuery } from './modal';
import * as i18n from './translations';

export const BUTTON_CLASS = 'inspectButtonComponent';
const VISIBILITY_CLASSES = [BUTTON_CLASS];

interface InspectButtonContainerProps {
  hide?: boolean;
  children: React.ReactNode;
}

export const InspectButtonContainer: React.FC<InspectButtonContainerProps> = memo(
  ({ children, hide }) => (
    <HoverVisibilityContainer hide={hide} targetClassNames={VISIBILITY_CLASSES}>
      {children}
    </HoverVisibilityContainer>
  )
);

interface InspectButtonProps {
  onCloseInspect?: () => void;
  showInspectButton?: boolean;
  getInspectQuery: GetInspectQuery;
  inspectTitle: string;
}

const InspectButtonComponent: React.FC<InspectButtonProps> = ({
  getInspectQuery,
  inspectTitle,
}) => {
  const [isShowingModal, setIsShowingModal] = useState(false);

  const onOpenModal = useCallback(() => {
    setIsShowingModal(true);
  }, []);

  const onCloseModal = useCallback(() => {
    setIsShowingModal(false);
  }, []);

  return (
    <>
      <EuiButtonIcon
        className={BUTTON_CLASS}
        aria-label={i18n.INSPECT}
        data-test-subj="inspect-icon-button"
        iconSize="m"
        iconType="inspect"
        title={i18n.INSPECT}
        onClick={onOpenModal}
      />
      {isShowingModal && (
        <ModalInspectQuery
          closeModal={onCloseModal}
          data-test-subj="inspect-modal"
          getInspectQuery={getInspectQuery}
          title={inspectTitle}
        />
      )}
    </>
  );
};

InspectButtonComponent.displayName = 'InspectButtonComponent';
export const InspectButton = React.memo(InspectButtonComponent);
