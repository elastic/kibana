/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React, { useCallback } from 'react';
import { css } from '@emotion/react/dist/emotion-react.cjs';
import { useDispatch } from 'react-redux';
import {
  previousSecurityFlyoutPreviewPanel,
  closeSecurityFlyoutPreviewPanel,
} from '../../store/flyout/reducers';
import { BACK_BUTTON } from './translations';

export interface PreviewSectionProps {
  /**
   * Component to be rendered
   */
  component: React.ReactElement;
  /**
   * Show/hide the back button in the header
   */
  showBackButton: boolean;
  /**
   * Width used when rendering the panel
   */
  width: number | undefined;
}

export const PreviewSection: React.FC<PreviewSectionProps> = ({
  component,
  showBackButton,
  width,
}: PreviewSectionProps) => {
  const dispatch = useDispatch();
  const closePreviewPanel = useCallback(
    () => dispatch(closeSecurityFlyoutPreviewPanel({ scope: '' })), // TODO figure out how to retrieve the scope
    [dispatch]
  );
  const previousPreviewPanel = useCallback(
    () => dispatch(previousSecurityFlyoutPreviewPanel({ scope: '' })), // TODO figure out how to retrieve the scope
    [dispatch]
  );

  const previewWith: string = width ? `${width}px` : '0px';

  const closeButton = (
    <EuiFlexItem grow={false}>
      <EuiButtonIcon iconType="cross" onClick={closePreviewPanel} />
    </EuiFlexItem>
  );
  const header = showBackButton ? (
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="xs"
          iconType="arrowLeft"
          iconSide="left"
          onClick={previousPreviewPanel}
        >
          {BACK_BUTTON}
        </EuiButtonEmpty>
      </EuiFlexItem>
      {closeButton}
    </EuiFlexGroup>
  ) : (
    <EuiFlexGroup justifyContent="flexEnd">{closeButton}</EuiFlexGroup>
  );

  return (
    <>
      <div
        css={css`
          position: absolute;
          top: 0;
          bottom: 0;
          right: 0;
          left: ${previewWith};
          background-color: #242934;
          opacity: 0.5;
        `}
      />
      <div
        css={css`
          position: absolute;
          top: 0;
          bottom: 0;
          right: 0;
          left: ${previewWith};
          z-index: 1000;
        `}
      >
        <EuiPanel
          css={css`
            margin: 8px;
            height: 100%;
          `}
        >
          {header}
          {component}
        </EuiPanel>
      </div>
    </>
  );
};

PreviewSection.displayName = 'PreviewSection';
