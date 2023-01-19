/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import type { State } from '..';
import type { SecurityFlyoutLayout, SecurityFlyoutPanel } from './model';

/**
 * This state is normalized, which means it avoids having nested data.
 * The relation between each data is managed using id tables.
 * See https://redux.js.org/recipes/structuring-reducers/normalizing-state-shape
 *
 * IMPORTANT: the panels ids HAVE TO be unique!
 */
export interface SecurityFlyoutState {
  /**
   * Object storing all the panels with the panel id being the key
   */
  byId: { [panelId: string]: SecurityFlyoutPanel };
  /**
   * Array storing ids of all the left panels
   */
  leftIds: string[];
  /**
   * Array storing ids of all the right panels
   */
  rightIds: string[];
  /**
   * Array storing ids of all the preview panels
   */
  previewIds: string[];
  /**
   * Object storing ids of all panels by scope
   */
  idsByScope: { [scopeId: string]: string[] };
  /**
   * Array storing all ids of all panels
   */
  allIds: string[];
}

export const initialFlyoutState: SecurityFlyoutState = {
  byId: {},
  leftIds: [],
  rightIds: [],
  previewIds: [],
  idsByScope: {},
  allIds: [],
};

export const flyoutSlice = createSlice({
  name: 'flyout',
  initialState: initialFlyoutState,
  reducers: {
    /**
     * Top open the security flyout.
     * Requires a scope (left, right and preview {@link SecurityFlyoutPanel} are optional).
     *
     * Removes all prior left, right and preview panels for the scope.
     */
    openSecurityFlyout: (
      state,
      action: PayloadAction<{
        scope: string;
        right?: SecurityFlyoutPanel;
        left?: SecurityFlyoutPanel;
        preview?: SecurityFlyoutPanel;
      }>
    ) => {
      const { scope, left, right, preview } = action.payload;

      const byId: { [panelId: string]: SecurityFlyoutPanel } = { ...state.byId };
      let leftIds: string[] = [...state.leftIds];
      let rightIds: string[] = [...state.rightIds];
      let previewIds: string[] = [...state.previewIds];
      const idsByScope: { [scopeId: string]: string[] } = { ...state.idsByScope };
      let allIds: string[] = [...state.allIds];

      // remove all previous panels for the state for the scope
      if (state.idsByScope[scope]) {
        // retrieve previous right panel id for the scope
        const previousRightId: string = state.idsByScope[scope].find((id: string) =>
          state.rightIds.includes(id)
        ) as string;

        // retrieve previous left panel id for the scope
        const previousLeftId: string = state.idsByScope[scope].find((id: string) =>
          state.leftIds.includes(id)
        ) as string;

        // retrieve previous left panel id for the scope
        const previousPreviewIds: string[] = state.idsByScope[scope].filter((id: string) =>
          state.previewIds.includes(id)
        );

        delete byId[previousRightId];
        delete byId[previousLeftId];
        previousPreviewIds.forEach((id: string) => byId[id]);

        leftIds = state.leftIds.filter((id: string) => id !== previousLeftId);

        rightIds = state.rightIds.filter((id: string) => id !== previousRightId);

        previewIds = state.previewIds.filter((id: string) => !previousPreviewIds.includes(id));

        allIds = state.allIds.filter(
          (id: string) =>
            id !== previousLeftId || id !== previousRightId || !previousPreviewIds.includes(id)
        );
      }

      idsByScope[scope] = [];

      // add new panels for the scope
      if (right) {
        const { id } = right;
        byId[id] = right;
        rightIds.push(id);
        idsByScope[scope].push(id);
        allIds.push(id);
      }

      if (left) {
        const { id } = left;
        byId[id] = left;
        leftIds.push(id);
        idsByScope[scope].push(id);
        allIds.push(id);
      }

      if (preview) {
        const { id } = preview;
        byId[id] = preview;
        previewIds.push(id);
        idsByScope[scope].push(id);
        allIds.push(id);
      }

      return { byId, leftIds, rightIds, previewIds, idsByScope, allIds };
    },
    /**
     * To open a right panel.
     * Requires a scope and a {@link SecurityFlyoutPanel}.
     *
     * Removes the previous right panel for the scope and replaces it with the new one.
     */
    openSecurityFlyoutRightPanel: (
      state,
      action: PayloadAction<{ scope: string; panel: SecurityFlyoutPanel }>
    ) => {
      const { scope, panel } = action.payload;

      // retrieve previous right panel id for the scope
      const previousRightId: string = state.idsByScope[scope].find((id: string) =>
        state.rightIds.includes(id)
      ) as string;

      // delete previous id
      const byId: { [panelId: string]: SecurityFlyoutPanel } = { ...state.byId };
      delete byId[previousRightId];

      let scopedIds: string[] = [...state.idsByScope[scope]];
      if (!state.idsByScope[scope]) {
        // if scope doesn't exist, create entry then save the new id
        scopedIds = [panel.id];
      } else {
        // if scope already exist, remove the previous id then add the new id
        scopedIds = scopedIds.filter((id: string) => id !== previousRightId);
        scopedIds.push(panel.id);
      }

      return {
        byId: { ...byId, [panel.id]: panel },
        leftIds: state.leftIds,
        rightIds: [...state.rightIds.filter((id: string) => id !== previousRightId), panel.id],
        previewIds: state.previewIds,
        idsByScope: { ...state.idsByScope, [scope]: scopedIds },
        allIds: [...state.allIds.filter((id: string) => id !== previousRightId), panel.id],
      };
    },
    /**
     * To open a left panel.
     * Requires a scope and a {@link SecurityFlyoutPanel}.
     *
     * Removes the previous left panel for the scope and replaces it with the new one.
     */
    openSecurityFlyoutLeftPanel: (
      state,
      action: PayloadAction<{ scope: string; panel: SecurityFlyoutPanel }>
    ) => {
      const { scope, panel } = action.payload;

      // retrieve previous left panel id for the scope
      const previousLeftId: string = state.idsByScope[scope].find((id: string) =>
        state.leftIds.includes(id)
      ) as string;

      // delete previous id
      const byId: { [panelId: string]: SecurityFlyoutPanel } = { ...state.byId };
      delete byId[previousLeftId];

      let scopedIds: string[] = [...state.idsByScope[scope]];
      if (!scopedIds) {
        // if scope doesn't exist, create entry then save the new id
        scopedIds = [panel.id];
      } else {
        // if scope already exist, remove the previous id then add the new id
        scopedIds = scopedIds.filter((id: string) => id !== previousLeftId);
        scopedIds.push(panel.id);
      }

      return {
        byId: { ...byId, [panel.id]: panel },
        leftIds: [...state.leftIds.filter((id: string) => id !== previousLeftId), panel.id],
        rightIds: state.rightIds,
        previewIds: state.previewIds,
        idsByScope: { ...state.idsByScope, [scope]: scopedIds },
        allIds: [...state.allIds.filter((id: string) => id !== previousLeftId), panel.id],
      };
    },
    /**
     * To open a preview panel.
     * Requires a scope and a {@link SecurityFlyoutPanel}.
     *
     * Adds to the array of preview panels.
     */
    openSecurityFlyoutPreviewPanel: (
      state,
      action: PayloadAction<{ scope: string; panel: SecurityFlyoutPanel }>
    ) => {
      const { scope, panel } = action.payload;

      let scopedIds: string[] = [...state.idsByScope[scope]];
      if (!scopedIds) {
        // if scope doesn't exist, create entry then save the new id
        scopedIds = [panel.id];
      } else {
        // if scope already exist, add the new id
        scopedIds.push(panel.id);
      }

      return {
        byId: { ...state.byId, [panel.id]: panel },
        leftIds: state.leftIds,
        rightIds: state.rightIds,
        previewIds: [...state.previewIds, panel.id],
        idsByScope: { ...state.idsByScope, [scope]: scopedIds },
        allIds: [...state.allIds, panel.id],
      };
    },
    /**
     * To close a right panel.
     * Requires a scope.
     *
     * Removes the right panel for the scope.
     */
    closeSecurityFlyoutRightPanel: (state, action: PayloadAction<{ scope: string }>) => {
      const { scope } = action.payload;

      if (!state.idsByScope[scope]) {
        return state;
      }

      const scopedIds: string[] = state.idsByScope[scope];
      const rightId: string = scopedIds.find((id: string) => state.rightIds.includes(id)) as string;

      const byId = { ...state.byId };
      delete byId[rightId];

      return {
        byId,
        leftIds: state.leftIds,
        rightIds: state.rightIds.filter((id: string) => id !== rightId),
        previewIds: state.previewIds,
        idsByScope: {
          ...state.idsByScope,
          [scope]: state.idsByScope[scope].filter((id: string) => id !== rightId),
        },
        allIds: state.allIds.filter((id: string) => id !== rightId),
      };
    },
    /**
     * To close a left panel.
     * Requires a scope.
     *
     * Removes the left panel for the scope.
     */
    closeSecurityFlyoutLeftPanel: (state, action: PayloadAction<{ scope: string }>) => {
      const { scope } = action.payload;

      if (!state.idsByScope[scope]) {
        return state;
      }

      const scopedIds: string[] = state.idsByScope[scope];
      const leftId: string = scopedIds.find((id: string) => state.leftIds.includes(id)) as string;

      const byId = { ...state.byId };
      delete byId[leftId];

      return {
        byId,
        leftIds: state.leftIds.filter((id: string) => id !== leftId),
        rightIds: state.rightIds,
        previewIds: state.previewIds,
        idsByScope: {
          ...state.idsByScope,
          [scope]: state.idsByScope[scope].filter((id: string) => id !== leftId),
        },
        allIds: state.allIds.filter((id: string) => id !== leftId),
      };
    },
    /**
     * To close a preview panel.
     * Requires a scope.
     *
     * Removes all the preview panels for the scope.
     */
    closeSecurityFlyoutPreviewPanel: (state, action: PayloadAction<{ scope: string }>) => {
      const { scope } = action.payload;

      if (!state.idsByScope[scope]) {
        return state;
      }

      const scopedIds: string[] = state.idsByScope[scope];
      const previewIds: string[] = scopedIds.filter((id: string) => state.previewIds.includes(id));

      const byId = { ...state.byId };
      previewIds.forEach((id: string) => delete byId[id]);

      return {
        byId,
        leftIds: state.leftIds,
        rightIds: state.rightIds,
        previewIds: state.previewIds.filter((id: string) => !previewIds.includes(id)),
        idsByScope: {
          ...state.idsByScope,
          [scope]: state.idsByScope[scope].filter((id: string) => !previewIds.includes(id)),
        },
        allIds: state.allIds.filter((id: string) => !previewIds.includes(id)),
      };
    },
    /**
     * To go to the previous preview panel.
     * Requires a scope.
     *
     * Removes the last entry in the array of preview panels for the scope.
     */
    previousSecurityFlyoutPreviewPanel: (state, action: PayloadAction<{ scope: string }>) => {
      const { scope } = action.payload;

      if (!state.idsByScope[scope]) {
        return state;
      }

      const scopedIds: string[] = [...state.idsByScope[scope]];
      const scopedPreviewIds: string[] = scopedIds.filter((id: string) =>
        state.previewIds.includes(id)
      );
      const mostRecentId: string = scopedPreviewIds[scopedPreviewIds.length - 1];

      const byId = { ...state.byId };
      delete byId[mostRecentId];

      const previewIds = [...state.previewIds];
      let index = previewIds.indexOf(mostRecentId);
      if (index !== -1) {
        previewIds.splice(index, 1);
      }

      const allIds = [...state.allIds];
      index = allIds.indexOf(mostRecentId);
      if (index !== -1) {
        allIds.splice(index, 1);
      }

      index = scopedIds.indexOf(mostRecentId);
      if (index !== -1) {
        scopedIds.splice(index, 1);
      }

      return {
        byId,
        leftIds: state.leftIds,
        rightIds: state.rightIds,
        previewIds,
        idsByScope: { ...state.idsByScope, [scope]: scopedIds },
        allIds,
      };
    },
    /**
     * To close the security flyout.
     * Requires a scope.
     *
     * Removes all the panels for the scope.
     */
    closeSecurityFlyout: (state, action: PayloadAction<{ scope: string }>) => {
      const { scope } = action.payload;

      if (!state.idsByScope[scope]) {
        return state;
      }

      // retrieve all ids for the scope
      const scopedIds: string[] = [...state.idsByScope[scope]];

      // remove scoped ids from byId
      const byId = { ...state.byId };
      scopedIds.forEach((id: string) => delete byId[id]);

      // remove scope entirely
      const idsByScope = { ...state.idsByScope };
      delete idsByScope[scope];

      return {
        byId,
        leftIds: state.leftIds.filter((id: string) => !scopedIds.includes(id)),
        rightIds: state.rightIds.filter((id: string) => !scopedIds.includes(id)),
        previewIds: state.previewIds.filter((id: string) => !scopedIds.includes(id)),
        idsByScope,
        allIds: state.allIds.filter((id: string) => !scopedIds.includes(id)),
      };
    },
  },
});

export const {
  openSecurityFlyout,
  openSecurityFlyoutRightPanel,
  openSecurityFlyoutLeftPanel,
  openSecurityFlyoutPreviewPanel,
  closeSecurityFlyoutRightPanel,
  closeSecurityFlyoutLeftPanel,
  closeSecurityFlyoutPreviewPanel,
  previousSecurityFlyoutPreviewPanel,
  closeSecurityFlyout,
} = flyoutSlice.actions;

const selectFlyout = (state: State): SecurityFlyoutState => state.flyout;

/**
 * Takes a scope as input and returns an object with left, right and preview panels.
 */
export const selectFlyoutLayout = (scope: string) =>
  createSelector(selectFlyout, (flyout: SecurityFlyoutState): SecurityFlyoutLayout => {
    const scopedPanelIds: string[] = flyout.idsByScope[scope];
    if (!scopedPanelIds) {
      return {
        right: {},
        left: {},
        preview: [],
      };
    }

    const leftPanelId: string = scopedPanelIds.find((id: string) =>
      flyout.leftIds.includes(id)
    ) as string;
    const rightPanelId: string = scopedPanelIds.find((id: string) =>
      flyout.rightIds.includes(id)
    ) as string;
    const previewPanelIds: string[] = scopedPanelIds.filter((id: string) =>
      flyout.previewIds.includes(id)
    );

    return {
      left: flyout.byId[leftPanelId],
      right: flyout.byId[rightPanelId],
      preview: previewPanelIds.map((id: string) => flyout.byId[id]),
    };
  });

export const flyoutReducer = flyoutSlice.reducer;
