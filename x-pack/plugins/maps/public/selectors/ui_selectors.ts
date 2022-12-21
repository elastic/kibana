/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MapStoreState } from '../reducers/store';

import { FLYOUT_STATE } from '../reducers/ui';
import { DRAW_MODE } from '../../common/constants';

export const getFlyoutDisplay = ({ ui }: MapStoreState): FLYOUT_STATE => ui.flyoutDisplay;
export const getDrawMode = ({ ui }: MapStoreState): DRAW_MODE => ui.drawMode;
export const getIsLayerTOCOpen = ({ ui }: MapStoreState): boolean => ui.isLayerTOCOpen;
export const getIsTimesliderOpen = ({ ui }: MapStoreState): boolean => ui.isTimesliderOpen;
export const getOpenTOCDetails = ({ ui }: MapStoreState): string[] => ui.openTOCDetails;
export const getIsFullScreen = ({ ui }: MapStoreState): boolean => ui.isFullScreen;
export const getIsReadOnly = ({ ui }: MapStoreState): boolean => ui.isReadOnly;
export const getAutoOpenLayerWizardId = ({ ui }: MapStoreState): string => ui.autoOpenLayerWizardId;
export const getDeletedFeatureIds = ({ ui }: MapStoreState): string[] => ui.deletedFeatureIds;
