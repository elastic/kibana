/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const getClustersList = (state) => state.clusters.asList;
export const getClustersByName = (state) => state.clusters.byName;
export const getClusterByName = (state, name) => getClustersByName(state)[name];

export const isDetailPanelOpen = (state) => state.detailPanel.isOpen;
export const getDetailPanelCluster = (state) =>
  getClusterByName(state, state.detailPanel.clusterName);
export const getDetailPanelClusterName = (state) => state.detailPanel.clusterName;

export const isLoading = (state) => state.clusters.isLoading;
export const clusterLoadError = (state) => state.clusters.clusterLoadError;

export const isAddingCluster = (state) => state.addCluster.isAdding;
export const getAddClusterError = (state) => state.addCluster.error;

export const getEditedCluster = (state) => getClustersByName(state)[state.editCluster.clusterName];
export const isEditingCluster = (state) => state.editCluster.isEditing;
export const getEditClusterError = (state) => state.editCluster.error;

export const isRemovingCluster = (state) => state.removeCluster.isRemoving;
