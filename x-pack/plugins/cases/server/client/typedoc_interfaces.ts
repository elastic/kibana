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

import type {
  Comments,
  CasePostRequest,
  CaseResolveResponse,
  Case,
  ConfigurationPatchRequest,
  ConfigurationRequest,
  Configuration,
  CasesFindRequest,
  CasesFindResponse,
  CasesPatchRequest,
  Cases,
  UserActions,
  CommentsFindResponse,
  CasesBulkGetResponse,
} from '../../common/api';

/**
 * These are simply to make typedoc not attempt to expand the type aliases. If it attempts to expand them
 * the docs are huge.
 */

export interface ICasePostRequest extends CasePostRequest {}
export interface ICasesFindRequest extends CasesFindRequest {}
export interface ICasesPatchRequest extends CasesPatchRequest {}
export interface ICaseResponse extends Case {}
export interface ICaseResolveResponse extends CaseResolveResponse {}
export interface ICasesResponse extends Cases {}
export interface ICasesFindResponse extends CasesFindResponse {}
export interface ICasesBulkGetResponse extends CasesBulkGetResponse {}

export interface ICasesConfigureResponse extends Configuration {}
export interface ICasesConfigureRequest extends ConfigurationRequest {}
export interface ICasesConfigurePatch extends ConfigurationPatchRequest {}

export interface ICommentsResponse extends CommentsFindResponse {}
export interface IAllCommentsResponse extends Comments {}

export interface ICaseUserActionsResponse extends UserActions {}
