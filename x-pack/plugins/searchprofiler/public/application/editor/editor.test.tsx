/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import 'brace';
import 'brace/mode/json';

import { TestUtils } from 'src/plugins/es_ui_shared/public';
import { Editor, Props } from '.';

const { registerTestBed } = TestUtils;

describe('Editor Component', () => {
  it('renders', async () => {
    const props: Props = {
      initialValue: '',
      licenseEnabled: true,
      onEditorReady: e => {},
    };
    // Ignore the warning about Worker not existing for now...
    const init = registerTestBed(Editor);
    await init(props);
  });
});
