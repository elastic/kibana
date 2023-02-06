/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon } from '@elastic/eui';
import React, { useState } from 'react';
import { GetInspectQuery } from '../../../../../../types';

import { HoverVisibilityContainer } from './hover_visibility_container';

import { ModalInspectQuery } from './modal';
import * as i18n from './translations';

export const BUTTON_CLASS = 'inspectButtonComponent';

interface InspectButtonContainerProps {
  hide?: boolean;
  children: React.ReactNode;
}

export const InspectButtonContainer: React.FC<InspectButtonContainerProps> = ({
  children,
  hide,
}) => (
  <HoverVisibilityContainer hide={hide} targetClassNames={[BUTTON_CLASS]}>
    {children}
  </HoverVisibilityContainer>
);

interface InspectButtonProps {
  onCloseInspect?: () => void;
  showInspectButton?: boolean;
  getInspectQuery: GetInspectQuery;
}

const InspectButtonComponent: React.FC<InspectButtonProps> = ({ getInspectQuery }) => {
  const [isShowingModal, setIsShowingModal] = useState(false);

  const onOpenModal = () => {
    setIsShowingModal(true);
  };

  const onCloseModal = () => {
    setIsShowingModal(false);
  };

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
        />
      )}
    </>
  );
};

InspectButtonComponent.displayName = 'InspectButtonComponent';
export const InspectButton = React.memo(InspectButtonComponent);
