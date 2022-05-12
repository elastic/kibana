/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * This file defines simpler types for typedoc. This helps reduce the type alias expansion for the io-ts types because it
 * can be very large. These types are equivalent to the io-ts aliases.
 * @module
 */

/* eslint-disable @typescript-eslint/no-empty-interface */

import {
  AllCommentsResponse,
  CasePostRequest,
  CaseResolveResponse,
  CaseResponse,
  CasesConfigurePatch,
  CasesConfigureRequest,
  CasesConfigureResponse,
  CasesFindRequest,
  CasesFindResponse,
  CasesPatchRequest,
  CasesResponse,
  CaseUserActionsResponse,
  CommentsResponse,
} from '../../common/api';

/**
 * These are simply to make typedoc not attempt to expand the type aliases. If it attempts to expand them
 * the docs are huge.
 */

export interface ICasePostRequest extends CasePostRequest {}
export interface ICasesFindRequest extends CasesFindRequest {}
export interface ICasesPatchRequest extends CasesPatchRequest {}
export interface ICaseResponse extends CaseResponse {}
export interface ICaseResolveResponse extends CaseResolveResponse {}
export interface ICasesResponse extends CasesResponse {}
export interface ICasesFindResponse extends CasesFindResponse {}

export interface ICasesConfigureResponse extends CasesConfigureResponse {}
export interface ICasesConfigureRequest extends CasesConfigureRequest {}
export interface ICasesConfigurePatch extends CasesConfigurePatch {}

export interface ICommentsResponse extends CommentsResponse {}
export interface IAllCommentsResponse extends AllCommentsResponse {}

export interface ICaseUserActionsResponse extends CaseUserActionsResponse {}
