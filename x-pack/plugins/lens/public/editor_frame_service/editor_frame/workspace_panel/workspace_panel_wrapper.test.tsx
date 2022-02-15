/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Visualization } from '../../../types';
import { createMockVisualization, createMockFramePublicAPI, FrameMock } from '../../../mocks';
import { WorkspacePanelWrapper } from './workspace_panel_wrapper';
import { mountWithProvider } from '../../../mocks';
import { ReactWrapper } from 'enzyme';
import {
  selectAutoApplyEnabled,
  updateVisualizationState,
  disableAutoApply,
} from '../../../state_management';

describe('workspace_panel_wrapper', () => {
  let mockVisualization: jest.Mocked<Visualization>;
  let mockFrameAPI: FrameMock;

  beforeEach(() => {
    mockVisualization = createMockVisualization();
    mockFrameAPI = createMockFramePublicAPI();
  });

  it('should render its children', async () => {
    const MyChild = () => <span>The child elements</span>;
    const { instance } = await mountWithProvider(
      <WorkspacePanelWrapper
        framePublicAPI={mockFrameAPI}
        visualizationState={{}}
        visualizationId="myVis"
        visualizationMap={{ myVis: mockVisualization }}
        datasourceMap={{}}
        datasourceStates={{}}
        isFullscreen={false}
      >
        <MyChild />
      </WorkspacePanelWrapper>
    );

    expect(instance.find(MyChild)).toHaveLength(1);
  });

  it('should call the toolbar renderer if provided', async () => {
    const renderToolbarMock = jest.fn();
    const visState = { internalState: 123 };
    await mountWithProvider(
      <WorkspacePanelWrapper
        framePublicAPI={mockFrameAPI}
        visualizationState={visState}
        children={<span />}
        visualizationId="myVis"
        visualizationMap={{ myVis: { ...mockVisualization, renderToolbar: renderToolbarMock } }}
        datasourceMap={{}}
        datasourceStates={{}}
        isFullscreen={false}
      />
    );

    expect(renderToolbarMock).toHaveBeenCalledWith(expect.any(Element), {
      state: visState,
      frame: mockFrameAPI,
      setState: expect.anything(),
    });
  });

  describe('auto-apply controls', () => {
    class Harness {
      private _instance: ReactWrapper;

      constructor(instance: ReactWrapper) {
        this._instance = instance;
      }

      update() {
        this._instance.update();
      }

      private get applyChangesButton() {
        return this._instance.find('button[data-test-subj="lensApplyChanges"]');
      }

      private get autoApplyToggleSwitch() {
        return this._instance.find('button[data-test-subj="lensToggleAutoApply"]');
      }

      toggleAutoApply() {
        this.autoApplyToggleSwitch.simulate('click');
      }

      public get autoApplySwitchOn() {
        return this.autoApplyToggleSwitch.prop('aria-checked');
      }

      applyChanges() {
        this.applyChangesButton.simulate('click');
      }

      public get canApplyChanges() {
        return !this.applyChangesButton.prop('disabled');
      }
    }

    let store: Awaited<ReturnType<typeof mountWithProvider>>['lensStore'];
    let harness: Harness;
    beforeEach(async () => {
      const { instance, lensStore } = await mountWithProvider(
        <WorkspacePanelWrapper
          framePublicAPI={mockFrameAPI}
          visualizationState={{}}
          visualizationId="myVis"
          visualizationMap={{ myVis: mockVisualization }}
          datasourceMap={{}}
          datasourceStates={{}}
          isFullscreen={false}
        >
          <div />
        </WorkspacePanelWrapper>
      );

      store = lensStore;
      harness = new Harness(instance);
    });

    it('toggles auto-apply', async () => {
      store.dispatch(disableAutoApply());
      harness.update();

      expect(selectAutoApplyEnabled(store.getState())).toBeFalsy();
      expect(harness.autoApplySwitchOn).toBeFalsy();
      expect(harness.canApplyChanges).toBeFalsy();

      harness.toggleAutoApply();

      expect(selectAutoApplyEnabled(store.getState())).toBeTruthy();
      expect(harness.autoApplySwitchOn).toBeTruthy();

      harness.toggleAutoApply();

      expect(selectAutoApplyEnabled(store.getState())).toBeFalsy();
      expect(harness.autoApplySwitchOn).toBeFalsy();
    });

    it('apply-changes button works', () => {
      store.dispatch(disableAutoApply());
      harness.update();

      expect(selectAutoApplyEnabled(store.getState())).toBeFalsy();
      expect(harness.canApplyChanges).toBeFalsy();

      // make a change
      store.dispatch(
        updateVisualizationState({
          visualizationId: store.getState().lens.visualization.activeId as string,
          newState: { something: 'changed' },
        })
      );
      harness.update();

      expect(harness.canApplyChanges).toBeTruthy();

      harness.applyChanges();

      expect(harness.canApplyChanges).toBeFalsy();
    });

    it('enabling auto apply while having unapplied changes works', () => {
      // setup
      store.dispatch(disableAutoApply());
      store.dispatch(
        updateVisualizationState({
          visualizationId: store.getState().lens.visualization.activeId as string,
          newState: { something: 'changed' },
        })
      );
      harness.update();

      expect(harness.canApplyChanges).toBeTruthy();
      expect(harness.autoApplySwitchOn).toBeFalsy();

      // enable auto apply
      harness.toggleAutoApply();

      expect(harness.canApplyChanges).toBeFalsy();
      // apply changes button should now be disabled
      expect(harness.autoApplySwitchOn).toBeTruthy();
      // state got applied
      expect(store.getState().lens.visualization.state).toEqual({ something: 'changed' });
    });
  });
});
