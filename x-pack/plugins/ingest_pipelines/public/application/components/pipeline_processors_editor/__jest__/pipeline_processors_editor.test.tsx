/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setup } from './pipeline_processors_editor_helpers';

const testProcessors = {
  processors: [
    {
      script: {
        source: 'ctx._type = null',
      },
    },
    {
      gsub: {
        field: '_index',
        pattern: '(.monitoring-\\w+-)6(-.+)',
        replacement: '$17$2',
      },
    },
  ],
};

describe('Pipeline Editor', () => {
  it('provides the same data out it got in if nothing changes', async () => {
    let stateReaderRef: any;
    await setup({
      ...(testProcessors as any),
      stateReaderRef: ref => (stateReaderRef = ref),
    });

    const data = stateReaderRef.current();
    expect(data).toEqual(testProcessors);
  });
});
