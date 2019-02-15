/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface ReturnType {
  error?: {
    message: string;
    code?: number;
  };
  success: boolean;
}

export interface ReturnTypeCreate<T> extends ReturnType {
  item: T;
  action: 'created';
}

export interface ReturnTypeUpdate<T> extends ReturnType {
  item: T;
  action: 'updated';
}

export interface ReturnTypeBulkCreate extends ReturnType {
  results: Array<{
    success: boolean;
    action: 'created';
    error?: {
      message: string;
      code?: number;
    };
  }>;
}

// delete
export interface ReturnTypeDelete extends ReturnType {
  action: 'deleted';
}

export interface ReturnTypeBulkDelete extends ReturnType {
  results: Array<{
    success: boolean;
    action: 'deleted';
    error?: {
      message: string;
      code?: number;
    };
  }>;
}

// upsert
export interface ReturnTypeUpsert<T> extends ReturnType {
  item: T;
  action: 'created' | 'updated';
}

// upsert bulk
export interface ReturnTypeBulkUpsert extends ReturnType {
  results: Array<{
    success: boolean;
    action: 'created' | 'updated';
    error?: {
      message: string;
      code?: number;
    };
  }>;
}

// list
export interface ReturnTypeList<T> extends ReturnType {
  list: T[];
}

// get
export interface ReturnTypeGet<T> extends ReturnType {
  item: T;
}

export interface ReturnTypeBulkGet<T> extends ReturnType {
  items: T[];
}

// action -- e.g. validate config block. Like ES simulate endpoint
export interface ReturnTypeAction extends ReturnType {
  result: {
    [key: string]: any;
  };
}
// e.g.
// {
//   result: {
//     username: { valid: true },
//     password: { valid: false, error: 'something' },
//     hosts: [
//       { valid: false }, { valid: true },
//     ]
//   }
// }

// bulk action -- e.g. assign tags to beats
export interface ReturnTypeBulkAction extends ReturnType {
  result?: Array<{
    success: boolean;
    result?: {
      [key: string]: any;
    };
    error?: {
      message: string;
      code?: number;
    };
  }>;
}
