/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../test_utilities/extend_jest';

/* eslint-disable prefer-const */

import { Simulator } from '../../test_utilities/simulator';
import { oneAncestorTwoChildren } from '../../data_access_layer/mocks/one_ancestor_two_children';
import { withManuallyControlledResponses } from '../../data_access_layer/mocks/with_manually_controlled_responses';

/**
 * These specs define the loading behavior for the graph and panel.
 */
describe('when resolver is mounted with a databaseDocumentID', () => {
  let respond: () => void;
  let simulator: Simulator;
  let resolverComponentInstanceID = 'resolverComponentInstanceID';
  let entityIDs: { origin: string; firstChild: string; secondChild: string };
  beforeEach(() => {
    const { metadata, dataAccessLayer } = oneAncestorTwoChildren();
    const dataController = withManuallyControlledResponses(dataAccessLayer);
    respond = dataController.respond;
    simulator = new Simulator({
      databaseDocumentID: metadata.databaseDocumentID,
      dataAccessLayer: dataController.dataAccessLayer,
      resolverComponentInstanceID,
    });
  });
  it('should show a loading message', async () => {
    await expect(
      simulator.mapStateTransitions(() => {
        return simulator.graphLoadingElement().length;
      })
    ).toSometimesYieldEqualTo(1);
  });
});
