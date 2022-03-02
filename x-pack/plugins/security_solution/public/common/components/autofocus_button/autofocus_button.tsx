/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonProps, PropsForButton } from '@elastic/eui';
import React, { FC, memo, useEffect, useRef } from 'react';

export const AutoFocusButton: FC<PropsForButton<EuiButtonProps>> = memo((props) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const button = <EuiButton buttonRef={buttonRef} {...props} />;

  useEffect(() => {
    if (buttonRef.current) {
      buttonRef.current.focus();
    }
  }, []);

  return button;
});

AutoFocusButton.displayName = 'AutoFocusButton';
