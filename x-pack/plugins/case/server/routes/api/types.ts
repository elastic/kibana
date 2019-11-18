/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum CaseState {
  open = 'open',
  closed = 'closed',
}

export interface User {
  id: string;
  name: string;
}

export interface Comment {
  id: string;
  comment: string;
  creation_date: number;
  last_edit_date: number;
  user: User;
}

export interface Case {
  assignees: User[] | [];
  comments: Comment[] | [];
  creation_date: number;
  description: string;
  last_edit_date: number;
  name: string;
  reporter: User;
  state: keyof typeof CaseState;
  tags: string[];
  type: string;
}

export interface NewCase {
  assignees?: User[];
  description: string;
  name: string;
  state: keyof typeof CaseState;
  tags?: string[];
  type: string;
}
