/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import { EuiToolTip, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import React, { memo, useState, useContext } from 'react';
import { WithCopyToClipboard } from '../../../common/lib/clipboard/with_copy_to_clipboard';
import { useColors } from '../use_colors';
import { ResolverPanelContext } from './panel_context';

interface StyledCopyableField {
  readonly backgroundColor: string;
  readonly activeBackgroundColor: string;
}

const StyledCopyableField = styled.div<StyledCopyableField>`
  background-color: ${(props) => props.backgroundColor};
  border-radius: 3px;
  padding: 4px;
  transition: background 0.2s ease;

  &:hover {
    background-color: ${(props) => props.activeBackgroundColor};
    color: #fff;
  }
`;

export const CopyablePanelField = memo(
  ({ textToCopy, content }: { textToCopy: string; content: JSX.Element | string }) => {
    const { linkColor, copyableBackground } = useColors();
    const [isOpen, setIsOpen] = useState(false);
    const panelContext = useContext(ResolverPanelContext);

    const onMouseEnter = () => setIsOpen(true);

    const ButtonContent = memo(() => (
      <StyledCopyableField
        backgroundColor={panelContext.isHoveringInPanel ? copyableBackground : 'transparent'}
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
