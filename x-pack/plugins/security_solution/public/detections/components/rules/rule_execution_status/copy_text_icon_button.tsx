/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useState } from 'react';
import { copyToClipboard, EuiButtonIcon, EuiToolTip } from '@elastic/eui';

import * as i18n from './translations';

interface CopyTextIconButtonProps {
  textToCopy: string;
}

export const CopyTextIconButton: React.FC<CopyTextIconButtonProps> = ({ textToCopy }) => {
  const buttonRef = useRef<HTMLAnchorElement | null>(null);
  const [isTextCopied, setTextCopied] = useState(false);

  const onClick = () => {
    /* 
        Setting focus explicitly for Safari. 
        Otherwise the tooltip disappears after you click the button and move the cursor out of its bounds.
        Also without it the tooltip won't change its state back to "Copy text"
    */
    if (buttonRef.current !== null) {
      buttonRef.current.focus();
    }
    copyToClipboard(textToCopy);
    setTextCopied(true);
  };

  const onBlur = () => {
    setTextCopied(false);
  };

  return (
    <EuiToolTip content={isTextCopied ? i18n.TEXT_COPIED : i18n.COPY_TEXT}>
      <EuiButtonIcon
        buttonRef={buttonRef}
        aria-label={i18n.COPY_TEXT_TO_CLIPBOARD}
        color="text"
        iconType="copy"
        onClick={onClick}
        onBlur={onBlur}
        data-test-subj="copyTextIconButton"
        role={'button'}
      />
    </EuiToolTip>
  );
};
