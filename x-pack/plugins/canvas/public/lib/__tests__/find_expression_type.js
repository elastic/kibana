/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import expect from 'expect.js';
// import proxyquire from 'proxyquire';
// import { Registry } from '../../../common/lib/registry';

// const registries = {
//   datasource: new Registry(),
//   transform: new Registry(),
//   model: new Registry(),
//   view: new Registry(),
// };

// const { findExpressionType } = proxyquire.noCallThru().load('../find_expression_type', {
//   '../expression_types/datasource': {
//     datasourceRegistry: registries.datasource,
//   },
//   '../expression_types/transform': {
//     transformRegistry: registries.transform,
//   },
//   '../expression_types/model': {
//     modelRegistry: registries.model,
//   },
//   '../expression_types/view': {
//     viewRegistry: registries.view,
//   },
// });

// describe('findExpressionType', () => {
//   let expTypes;

//   beforeEach(() => {
//     expTypes = [];
//     const keys = Object.keys(registries);
//     keys.forEach(key => {
//       const reg = registries[key];
//       reg.reset();

//       const expObj = () => ({
//         name: `__test_${key}`,
//         key,
//       });
//       expTypes.push(expObj);
//       reg.register(expObj);
//     });
//   });

//   describe('all types', () => {
//     it('returns the matching item, by name', () => {
//       const match = findExpressionType('__test_model');
//       expect(match).to.eql(expTypes[2]());
//     });

//     it('returns null when nothing is found', () => {
//       const match = findExpressionType('@@nope_nope_nope');
//       expect(match).to.equal(null);
//     });

//     it('throws with multiple matches', () => {
//       const commonName = 'commonName';
//       registries.transform.register(() => ({
//         name: commonName,
//       }));
//       registries.model.register(() => ({
//         name: commonName,
//       }));

//       const check = () => {
//         findExpressionType(commonName);
//       };
//       expect(check).to.throwException(/Found multiple expressions/i);
//     });
//   });

//   describe('specific type', () => {
//     it('return the match item, by name and type', () => {
//       const match = findExpressionType('__test_view', 'view');
//       expect(match).to.eql(expTypes[3]());
//     });

//     it('returns null with no match by name and type', () => {
//       const match = findExpressionType('__test_view', 'datasource');
//       expect(match).to.equal(null);
//     });
//   });
// });

// TODO: restore this test
// proxyquire can not be used to inject mock registries

describe.skip('findExpressionType', () => {});
