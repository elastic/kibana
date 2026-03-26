/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export const verifyErrorResponse = (
  r: any,
  expectedCode: number,
  message?: string,
  shouldHaveAttrs?: boolean
) => {
  expect(r.statusCode).to.be(expectedCode);
  if (message) {
    expect(r.message).to.include.string(message);
  }
  if (shouldHaveAttrs) {
    expect(r).to.have.property('attributes');
    expect(r.attributes).to.have.property('error');
    expect(r.attributes.error).to.have.property('root_cause');
  } else {
    expect(r).not.to.have.property('attributes');
  }
};
