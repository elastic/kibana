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

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: { caseId: 'basic-case-id' },
    });
  });

  it('removes foo:bar attributes from request', () => {
    const query = SwimlaneFieldsRT.decode({ caseId: 'basic-case-id', foo: 'bar' });

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: { caseId: 'basic-case-id' },
    });
  });
});
