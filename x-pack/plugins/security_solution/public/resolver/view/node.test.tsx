/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noAncestorsTwoChildren } from '../data_access_layer/mocks/no_ancestors_two_children';
import { Simulator } from '../test_utilities/simulator';
// Extend jest with a custom matcher
import '../test_utilities/extend_jest';

let simulator: Simulator;
let databaseDocumentID: string;

// the resolver component instance ID, used by the react code to distinguish piece of global state from those used by other resolver instances
const resolverComponentInstanceID = 'resolverComponentInstanceID';

describe('Resolver, when analyzing a tree that has no ancestors and 2 children', () => {
  beforeEach(async () => {
    // create a mock data access layer
    const { metadata: dataAccessLayerMetadata, dataAccessLayer } = noAncestorsTwoChildren();

    // save a reference to the `_id` supported by the mock data layer
    databaseDocumentID = dataAccessLayerMetadata.databaseDocumentID;

    // create a resolver simulator, using the data access layer and an arbitrary component instance ID
    simulator = new Simulator({
      databaseDocumentID,
      dataAccessLayer,
      resolverComponentInstanceID,
      indices: [],
    });
  });

  it('shows 1 node with the words "Analyzed Event" in the label', async () => {
    await expect(
      simulator.map(() => {
        return simulator.testSubject('resolver:node:description').map((element) => element.text());
      })
    ).toYieldEqualTo(['Analyzed Event · Running Process', 'Running Process', 'Running Process']);
  });
});
