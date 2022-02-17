/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { YamlCodeEditorWithPlaceholder as Component } from './yaml_code_editor_with_placeholder';

export default {
  component: Component,
  title: 'Sections/Fleet/Settings/YamlCodeEditorWithPlaceholder',
};

interface Args {
  width: number;
  placeholder: string;
}

const args: Args = {
  width: 1200,
  placeholder: '# Place holder example',
};

export const YamlCodeEditorWithPlaceholder = ({ width, placeholder }: Args) => {
  const [value, setValue] = useState('');

  // This component is not renderable in tests
  if (typeof jest !== 'undefined') {
    return null;
  }

  return (
    <div style={{ width }}>
      <Component placeholder={placeholder} value={value} onChange={setValue} />
    </div>
  );
};

YamlCodeEditorWithPlaceholder.args = args;
