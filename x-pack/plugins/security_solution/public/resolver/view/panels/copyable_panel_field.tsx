/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import { EuiToolTip, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import React, { memo, useState } from 'react';
import { WithCopyToClipboard } from '../../../common/lib/clipboard/with_copy_to_clipboard';
import { useColors } from '../use_colors';
import { StyledPanel } from '../styles';

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

    const onMouseEnter = () => setIsOpen(true);

    const ButtonContent = memo(() => (
      <StyledCopyableField
        backgroundColor={copyableFieldBackground}
        data-test-subj="resolver:panel:copyable-field"
        activeBackgroundColor={linkColor}
        onMouseEnter={onMouseEnter}
      >
        {content}
      </StyledCopyableField>
    ));

    const onMouseLeave = () => setIsOpen(false);

    return (
      <div onMouseLeave={onMouseLeave}>
        <EuiPopover
          anchorPosition={'downCenter'}
          button={<ButtonContent />}
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
            <WithCopyToClipboard
              data-test-subj="resolver:panel:copy-to-clipboard"
              text={textToCopy}
              titleSummary={textToCopy}
            />
          </EuiToolTip>
        </EuiPopover>
      </div>
    );
  }
);
