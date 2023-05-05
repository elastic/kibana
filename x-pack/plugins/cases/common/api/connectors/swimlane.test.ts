/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SwimlaneFieldsRT } from './swimlane';

describe('SwimlaneFieldsRT', () => {
  it('has expected attributes in request', () => {
    const query = SwimlaneFieldsRT.decode({ caseId: 'basic-case-id' });

    expect(query).toMatchObject({
      _tag: 'Right',
      right: { caseId: 'basic-case-id' },
    });
  });

  it('has only name and owner in request', () => {
    const query = SwimlaneFieldsRT.decode({ caseId: 'basic-case-id', foo: 'bar' });

    expect(query).toMatchObject({
      _tag: 'Right',
      right: { caseId: 'basic-case-id' },
    });
  });
});
