/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButton } from '@elastic/eui';
import { useState } from 'react';
import { Required } from 'utility-types';
import type { EuiButtonPropsForButton } from '@elastic/eui/src/components/button/button';

export function ActionButton(props: Required<EuiButtonPropsForButton, 'onClick'>) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <EuiButton
      {...props}
      data-test-subj={props['data-test-subj']}
      isDisabled={props.isDisabled ?? isLoading}
      isLoading={isLoading}
      onClick={(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void => {
        setIsLoading(true);
        Promise.resolve()
          .then(() => props.onClick(event))
          .finally(() => setIsLoading(false));
      }}
    />
  );
}
