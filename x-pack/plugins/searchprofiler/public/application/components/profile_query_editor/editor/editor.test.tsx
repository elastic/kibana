/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import 'brace';
import 'brace/mode/json';

import { coreMock } from '@kbn/core/public/mocks';
import { registerTestBed } from '@kbn/test-jest-helpers';
import { Editor, Props } from './editor';

const coreStart = coreMock.createStart();

describe('Editor Component', () => {
  it('renders', async () => {
    const props: Props = {
      ...coreStart,
      initialValue: '',
      licenseEnabled: true,
      onEditorReady: (e: any) => {},
    };
    // Ignore the warning about Worker not existing for now...
    const init = registerTestBed(Editor);
    await init(props);
  });
});
