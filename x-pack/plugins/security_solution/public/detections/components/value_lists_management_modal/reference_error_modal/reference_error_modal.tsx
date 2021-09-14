/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, EuiListGroup, EuiListGroupItem } from '@elastic/eui';
import styled from 'styled-components';
import { rgba } from 'polished';

const MarkdownContainer = styled.div`
  max-height: 200px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    height: ${({ theme }) => theme.eui.euiScrollBar};
    width: ${({ theme }) => theme.eui.euiScrollBar};
  }

  &::-webkit-scrollbar-thumb {
    background-clip: content-box;
    background-color: ${({ theme }) => rgba(theme.eui.euiColorDarkShade, 0.5)};
    border: ${({ theme }) => theme.eui.euiScrollBarCorner} solid transparent;
  }

  &::-webkit-scrollbar-corner,
  &::-webkit-scrollbar-track {
    background-color: transparent;
  }
`;

interface ReferenceErrorModalProps {
  cancelText: string;
  confirmText: string;
  contentText: string;
  onCancel: () => void;
  onClose: () => void;
  onConfirm: () => void;
  references: string[];
  showModal: boolean;
  titleText: string;
}

export const ReferenceErrorModalComponent: React.FC<ReferenceErrorModalProps> = ({
  cancelText,
  confirmText,
  contentText,
  onClose,
  onCancel,
  onConfirm,
  references = [],
  showModal,
  titleText,
}) => {
  if (!showModal) {
    return null;
  }

  return (
    <EuiConfirmModal
      maxWidth={460}
      title={titleText}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={cancelText}
      confirmButtonText={confirmText}
      buttonColor="danger"
      defaultFocusedButton="confirm"
      data-test-subj="referenceErrorModal"
    >
      <p>{contentText}</p>
      <MarkdownContainer>
        <EuiListGroup gutterSize="none" showToolTips>
          {references.map((r, index) => (
            <EuiListGroupItem key={`${index}-${r}`} label={r} />
          ))}
        </EuiListGroup>
      </MarkdownContainer>
    </EuiConfirmModal>
  );
};

ReferenceErrorModalComponent.displayName = 'ReferenceErrorModalComponent';

export const ReferenceErrorModal = React.memo(ReferenceErrorModalComponent);

ReferenceErrorModal.displayName = 'ReferenceErrorModal';
