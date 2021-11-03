/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import React, { useCallback, useState } from 'react';
import styled, { css } from 'styled-components';

import { ModalInspectQuery } from './modal';
import * as i18n from './translations';
import { InspectQuery } from '../../store/t_grid/inputs';

export const BUTTON_CLASS = 'inspectButtonComponent';

export const InspectButtonContainer = styled.div<{ show?: boolean }>`
  width: 100%;
  display: flex;
  flex-grow: 1;

  > * {
    max-width: 100%;
  }

  .${BUTTON_CLASS} {
    pointer-events: none;
    opacity: 0;
    transition: opacity ${(props) => getOr(250, 'theme.eui.euiAnimSpeedNormal', props)} ease;
  }

  ${({ show }) =>
    show &&
    css`
      &:hover .${BUTTON_CLASS} {
        pointer-events: auto;
        opacity: 1;
      }
    `}
`;

InspectButtonContainer.displayName = 'InspectButtonContainer';

InspectButtonContainer.defaultProps = {
  show: true,
};

interface OwnProps {
  inspect: InspectQuery | null;
  isDisabled?: boolean;
  loading: boolean;
  onCloseInspect?: () => void;
  title: string | React.ReactElement | React.ReactNode;
}

export type InspectButtonProps = OwnProps;

const InspectButtonComponent: React.FC<InspectButtonProps> = ({
  inspect,
  isDisabled,
  loading,
  onCloseInspect,
  title = '',
}) => {
  const [isInspected, setIsInspected] = useState(false);
  const isShowingModal = !loading && isInspected;
  const handleClick = useCallback(() => {
    setIsInspected(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    if (onCloseInspect != null) {
      onCloseInspect();
    }
    setIsInspected(false);
  }, [onCloseInspect, setIsInspected]);

  let request: string | null = null;
  if (inspect != null && inspect.dsl.length > 0) {
    request = inspect.dsl[0];
  }

  let response: string | null = null;
  if (inspect != null && inspect.response.length > 0) {
    response = inspect.response[0];
  }

  return (
    <>
      <EuiButtonIcon
        className={BUTTON_CLASS}
        aria-label={i18n.INSPECT}
        data-test-subj="inspect-icon-button"
        iconSize="m"
        iconType="inspect"
        isDisabled={loading || isDisabled || false}
        title={i18n.INSPECT}
        onClick={handleClick}
      />
      <ModalInspectQuery
        closeModal={handleCloseModal}
        isShowing={isShowingModal}
        request={request}
        response={response}
        title={title}
        data-test-subj="inspect-modal"
      />
    </>
  );
};

export const InspectButton = React.memo(InspectButtonComponent);
