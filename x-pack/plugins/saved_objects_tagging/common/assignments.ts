/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * `type`+`id` tuple of a saved object.
 */
export interface ObjectReference {
  type: string;
  id: string;
}

/**
 * Represent an assignable saved object, as returned by the `_find_assignable_objects` API
 */
export interface AssignableObject extends ObjectReference {
  icon?: string;
  title: string;
  tags: string[];
}

export interface UpdateTagAssignmentsOptions {
  tags: string[];
  assign: ObjectReference[];
  unassign: ObjectReference[];
}

export interface FindAssignableObjectOptions {
  search?: string;
  maxResults?: number;
  types?: string[];
}

export const getKey = ({ id, type }: ObjectReference) => `${type}|${id}`;
