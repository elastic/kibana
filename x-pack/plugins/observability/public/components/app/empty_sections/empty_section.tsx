/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt, EuiText } from '@elastic/eui';
import React from 'react';

interface Props {
  description: string;
  id: string;
  title: string;
  href?: string;
  linkTitle?: string;
  target?: '_blank';
}

export function EmptySection({ description, id, title, href, linkTitle, target }: Props) {
  return (
    <EuiEmptyPrompt
      style={{ maxWidth: 'none' }}
      title={<h2>{title}</h2>}
      titleSize="xs"
      body={<EuiText color="default">{description}</EuiText>}
      actions={
        <>
          {linkTitle && (
            <EuiButton
              size="s"
              color="primary"
              fill
              href={href}
              target={target}
              data-test-subj={`empty-${id}`}
            >
              {linkTitle}
            </EuiButton>
          )}
        </>
      }
    />
  );
}
