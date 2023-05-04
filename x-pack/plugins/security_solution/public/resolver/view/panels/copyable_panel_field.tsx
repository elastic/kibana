/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name */

import { EuiToolTip, EuiButtonIcon, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import React, { memo, useState, useCallback, useContext, useMemo } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useColors } from '../use_colors';
import { StyledPanel } from '../styles';
import { SideEffectContext } from '../side_effect_context';

interface StyledCopyableField {
  readonly backgroundColor: string;
  readonly activeBackgroundColor: string;
}

const StyledCopyableField = styled.div<StyledCopyableField>`
  border-radius: 3px;
  padding: 4px;
  transition: background 0.2s ease;

  ${StyledPanel}:hover & {
    background-color: ${(props) => props.backgroundColor};

    &:hover {
      background-color: ${(props) => props.activeBackgroundColor};
      color: #fff;
    }
  }
`;

/**
 * Field that behaves similarly to the current implementation of copyable fields in timeline as of 7.10
 * When the panel is hovered, these fields will show a gray background
 * When you then hover over these fields they will show a blue background and a tooltip with a copy button will appear
 */
export const CopyablePanelField = memo(
  ({ textToCopy, content }: { textToCopy: string; content: JSX.Element | string }) => {
    const { linkColor, copyableFieldBackground } = useColors();
    const [isOpen, setIsOpen] = useState(false);
    const toasts = useKibana().services.notifications?.toasts;

    const onMouseEnter = () => setIsOpen(true);
    const onMouseLeave = () => setIsOpen(false);

    const hoverArea = useMemo(
      () => (
        <StyledCopyableField
          backgroundColor={copyableFieldBackground}
          data-test-subj="resolver:panel:copyable-field-hover-area"
          activeBackgroundColor={linkColor}
          onMouseEnter={onMouseEnter}
        >
          {content}
        </StyledCopyableField>
      ),
      [content, copyableFieldBackground, linkColor]
    );

    const { writeTextToClipboard } = useContext(SideEffectContext);

    const onClick = useCallback(async () => {
      try {
        await writeTextToClipboard(textToCopy);
      } catch (error) {
        if (toasts) {
          toasts.addError(error, {
            title: i18n.translate('xpack.securitySolution.resolver.panel.copyFailureTitle', {
              defaultMessage: 'Copy Failure',
            }),
          });
        }
      }
    }, [textToCopy, toasts, writeTextToClipboard]);

    return (
      <div onMouseLeave={onMouseLeave}>
        <EuiPopover
          anchorPosition={'downCenter'}
          button={hoverArea}
          closePopover={onMouseLeave}
          hasArrow={false}
          isOpen={isOpen}
          panelPaddingSize="s"
        >
          <EuiToolTip
            content={i18n.translate('xpack.securitySolution.resolver.panel.copyToClipboard', {
              defaultMessage: 'Copy to Clipboard',
            })}
          >
            <EuiButtonIcon
              aria-label={i18n.translate('xpack.securitySolution.resolver.panel.copyToClipboard', {
                defaultMessage: 'Copy to Clipboard',
              })}
              color="text"
              data-test-subj="resolver:panel:clipboard"
              iconType="copyClipboard"
              onClick={onClick}
            />
          </EuiToolTip>
        </EuiPopover>
      </div>
    );
  }
);
