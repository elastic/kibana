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

interface StyledCopyableField {
  readonly borderColor: string;
  readonly hoverBackground: string;
}

const StyledCopyableField = styled.div<StyledCopyableField>`
  border: 0.1em solid;
  border-color: ${(props) => props.borderColor};
  border-radius: 3px;
  padding: 4px;

  &:hover {
    background-color: ${(props) => props.hoverBackground};
    color: #fff;
  }
`;

export const CopyablePanelField = memo(
  ({ textToCopy, content }: { textToCopy: string; content: JSX.Element | string }) => {
    const { linkColor, pillStroke } = useColors();
    const [isOpen, setIsOpen] = useState(false);
    const onMouseEnter = () => setIsOpen(true);

    const buttonContent = memo(() => (
      <StyledCopyableField
        borderColor={pillStroke}
        data-test-subj="resolver:panel:copyable-field"
        hoverBackground={linkColor}
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
          button={buttonContent}
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
