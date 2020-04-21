/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyAction } from 'redux';

export const UPDATE_FLYOUT: string;
export const CLOSE_SET_VIEW: string;
export const OPEN_SET_VIEW: string;
export const SET_IS_LAYER_TOC_OPEN: string;
export const SET_FULL_SCREEN: string;
export const SET_READ_ONLY: string;
export const SET_OPEN_TOC_DETAILS: string;
export const SHOW_TOC_DETAILS: string;
export const HIDE_TOC_DETAILS: string;
export const UPDATE_INDEXING_STAGE: string;

export function setOpenTOCDetails(layerIds?: string[]): AnyAction;

export function setIsLayerTOCOpen(open: boolean): AnyAction;

export function setReadOnly(readOnly: boolean): AnyAction;
