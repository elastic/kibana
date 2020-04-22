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
    const onUpdate = jest.fn();

    await setup({
      value: {
        ...(testProcessors as any),
      },
      onUpdate,
    });

    const {
      calls: [[arg]],
    } = onUpdate.mock;

    expect(arg.getData()).toEqual(testProcessors);
  });
});
