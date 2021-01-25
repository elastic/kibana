/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createMemoryHistory, History as HistoryPackageHistoryInterface } from 'history';
import { noAncestorsTwoChildrenWithRelatedEventsOnOrigin } from '../data_access_layer/mocks/no_ancestors_two_children_with_related_events_on_origin';
import { Simulator } from '../test_utilities/simulator';
import '../test_utilities/extend_jest';
import { urlSearch } from '../test_utilities/url_search';
import { panAnimationDuration } from '../store/camera/scaling_constants';

const resolverComponentInstanceID = 'useSyncSelectedNodeTestInstanceId';

describe(`Resolver: when analyzing a tree with 0 ancestors, 2 children, 2 related registry events, and 1 event of each other category on the origin, with the component instance ID: ${resolverComponentInstanceID}, and the origin node selected`, () => {
  let simulator: Simulator;
  let memoryHistory: HistoryPackageHistoryInterface<never>;

  // node IDs used by the generator
  let entityIDs: {
    origin: string;
    firstChild: string;
    secondChild: string;
  };

  beforeEach(() => {
    const {
      metadata: dataAccessLayerMetadata,
      dataAccessLayer,
    } = noAncestorsTwoChildrenWithRelatedEventsOnOrigin();

    entityIDs = dataAccessLayerMetadata.entityIDs;

    memoryHistory = createMemoryHistory();

    simulator = new Simulator({
      databaseDocumentID: dataAccessLayerMetadata.databaseDocumentID,
      dataAccessLayer,
      resolverComponentInstanceID,
      history: memoryHistory,
      indices: [],
      shouldUpdate: false,
      filters: {},
    });

    const queryStringWithOriginSelected = urlSearch(resolverComponentInstanceID, {
      panelParameters: { nodeID: 'origin' },
      panelView: 'nodeDetail',
    });

    memoryHistory.push({
      search: queryStringWithOriginSelected,
    });
  });

  describe('when the primary button for the first child is selected', () => {
    beforeEach(async () => {
      const firstChildPrimaryButton = await simulator.resolveWrapper(() =>
        simulator.processNodePrimaryButton(entityIDs.firstChild)
      );

      if (firstChildPrimaryButton) {
        firstChildPrimaryButton.simulate('click', { button: 0 });
        simulator.runAnimationFramesTimeFromNow(panAnimationDuration);
      }
    });

    it('should show the first child as the active and selected node', async () => {
      await expect(
        simulator.map(() => ({
          unselectedOriginCount: simulator.unselectedProcessNode(entityIDs.origin).length,
          selectedFirstChildCount: simulator.selectedProcessNode(entityIDs.firstChild).length,
          unselectedSecondChildCount: simulator.unselectedProcessNode(entityIDs.secondChild).length,
          nodePrimaryButtonCount: simulator.testSubject('resolver:node:primary-button').length,
        }))
      ).toYieldEqualTo({
        unselectedOriginCount: 1,
        selectedFirstChildCount: 1,
        unselectedSecondChildCount: 1,
        nodePrimaryButtonCount: 3,
      });
    });

    describe('when the browser is returned to the previous url where the origin was selected by triggering the back button', () => {
      beforeEach(async () => {
        memoryHistory.goBack();
        simulator.runAnimationFramesTimeFromNow(panAnimationDuration);
      });

      it('should show the origin node as the selected node', async () => {
        await expect(
          simulator.map(() => ({
            selectedOriginCount: simulator.selectedProcessNode(entityIDs.origin).length,
            unselectedFirstChildCount: simulator.unselectedProcessNode(entityIDs.firstChild).length,
            unselectedSecondChildCount: simulator.unselectedProcessNode(entityIDs.secondChild)
              .length,
            nodePrimaryButtonCount: simulator.testSubject('resolver:node:primary-button').length,
          }))
        ).toYieldEqualTo({
          selectedOriginCount: 1,
          unselectedFirstChildCount: 1,
          unselectedSecondChildCount: 1,
          nodePrimaryButtonCount: 3,
        });
      });
    });

    describe('when the browser forward button is triggered after the back button is triggered to return to the first child being selected', () => {
      beforeEach(async () => {
        // Return back to the origin being selected
        memoryHistory.goBack();
        simulator.runAnimationFramesTimeFromNow(panAnimationDuration);

        // Then hit the 'forward' button to return back to the first child being selected
        memoryHistory.goForward();
        simulator.runAnimationFramesTimeFromNow(panAnimationDuration);
      });

      it('should show the firstChild node as the selected node', async () => {
        await expect(
          simulator.map(() => ({
            unselectedOriginCount: simulator.unselectedProcessNode(entityIDs.origin).length,
            selectedFirstChildCount: simulator.selectedProcessNode(entityIDs.firstChild).length,
            unselectedSecondChildCount: simulator.unselectedProcessNode(entityIDs.secondChild)
              .length,
            nodePrimaryButtonCount: simulator.testSubject('resolver:node:primary-button').length,
          }))
        ).toYieldEqualTo({
          unselectedOriginCount: 1,
          selectedFirstChildCount: 1,
          unselectedSecondChildCount: 1,
          nodePrimaryButtonCount: 3,
        });
      });
    });
  });
});
