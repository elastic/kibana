/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { EuiButton, EuiModal, EuiModalBody, EuiModalFooter, EuiText } from '@elastic/eui';
import { ExploratoryViewPage } from '../index';
import { TypedLensByValueInput } from '../../../../../../lens/public';
import { ExploratoryViewModal } from './index';

export interface ExploratoryModalProps {
  isOpen: boolean;
  onClose: (attributes: TypedLensByValueInput['attributes'] | null) => void;
}

// eslint-disable-next-line import/no-default-export
export default function Modal({ isOpen, onClose }: ExploratoryModalProps) {
  const [lensAttributes, setLensAttributes] = useState<TypedLensByValueInput['attributes'] | null>(
    null
  );

  const closeModal = () => {
    onClose(lensAttributes);
  };

  return isOpen ? (
    <ModalWrapper
      onClose={closeModal}
      style={{ minWidth: 1200, width: '80%', maxWidth: '80%', height: '95vh' }}
    >
      <EuiModalBody>
        <div style={{ height: '100%', width: '100%' }}>
          <Wrapper>
            <ExploratoryViewPage useSessionStorage={true} saveAttributes={setLensAttributes} />
          </Wrapper>
        </div>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButton onClick={closeModal} fill>
          Close
        </EuiButton>
      </EuiModalFooter>
    </ModalWrapper>
  ) : null;
}

const Wrapper = styled.div`
  height: 100%;
  &&& {
    > :nth-child(2) {
      height: calc(100% - 56px);
    }
  }
`;

const ModalWrapper = styled(EuiModal)`
  &&& {
    top: 50px;
    min-width: 1200px;
    width: 80%;
    max-width: 80%;
    height: 95vh;
    .euiModal__flex {
      max-height: initial;
    }
  }
`;
