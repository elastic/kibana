/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setup } from './pipeline_editor_helpers';

const testPipeline = {
  name: 'test',
  description: 'This is a test pipeline',
  version: 1,
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
  onFailure: [],
};

describe('Pipeline Editor', () => {
  it('provides the same data out it got in if nothing changes', async () => {
    const onDone = jest.fn();
    const { clickDoneButton } = await setup({ pipeline: testPipeline as any, onSubmit: onDone });
    await clickDoneButton();
    expect(onDone).toHaveBeenCalledWith(testPipeline);
  });
});
