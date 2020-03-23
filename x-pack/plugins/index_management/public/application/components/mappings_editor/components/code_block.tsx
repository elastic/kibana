/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

/**
 * The <EuiCode /> component expect the children provided to be a string (html).
 * This component allows both string and JSX element
 *
 * TODO: Open PR on eui repo to allow both string and React.Node to be passed as children of <EuiCode />
 */

interface Props {
  children: React.ReactNode;
  padding?: 'small' | 'normal';
}

export const CodeBlock = ({ children, padding = 'normal' }: Props) => (
  <div className="euiCodeBlock euiCodeBlock--fontSmall euiCodeBlock--paddingLarge">
    <pre
      className="euiCodeBlock__pre"
      style={{ padding: padding === 'small' ? '6px 12px' : undefined }}
    >
      <code className="euiCodeBlock__code">{children}</code>
    </pre>
  </div>
);
