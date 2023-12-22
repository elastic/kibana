/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

const FooterComponent: React.FC = () => {
  return <div className="euiMarkdownEditorFooter" style={{ width: '100%', minHeight: '42px' }} />;
};

FooterComponent.displayName = 'Footer';

export const Footer = React.memo(FooterComponent);
