/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

import { TextScale } from '../../../../common/log_text_scale';

const actionCreator = actionCreatorFactory('x-pack/infra/local/log_textview');

export const setTextviewScale = actionCreator<TextScale>('SET_TEXTVIEW_SCALE');

export const setTextviewWrap = actionCreator<boolean>('SET_TEXTVIEW_WRAP');
