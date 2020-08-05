/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MapStoreState } from '../reducers/store';

import { FLYOUT_STATE } from '../reducers/ui';

export const getFlyoutDisplay = ({ ui }: MapStoreState): FLYOUT_STATE => ui.flyoutDisplay;
export const getIsSetViewOpen = ({ ui }: MapStoreState): boolean => ui.isSetViewOpen;
export const getIsLayerTOCOpen = ({ ui }: MapStoreState): boolean => ui.isLayerTOCOpen;
export const getOpenTOCDetails = ({ ui }: MapStoreState): string[] => ui.openTOCDetails;
export const getIsFullScreen = ({ ui }: MapStoreState): boolean => ui.isFullScreen;
export const getIsReadOnly = ({ ui }: MapStoreState): boolean => ui.isReadOnly;
