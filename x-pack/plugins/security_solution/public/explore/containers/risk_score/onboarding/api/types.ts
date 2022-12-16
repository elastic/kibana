/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup, NotificationsStart, ThemeServiceStart } from '@kbn/core/public';

interface RiskyScoreApiBase {
  errorMessage?: string;
  http: HttpSetup;
  notifications?: NotificationsStart;
  renderDocLink?: (message: string) => React.ReactNode;
  signal?: AbortSignal;
  theme?: ThemeServiceStart;
}
export interface CreateIngestPipeline extends RiskyScoreApiBase {
  options: {
    name: string;
    processors: string | Array<Record<string, unknown>>;
  };
}

export interface DeleteIngestPipeline extends RiskyScoreApiBase {
  names: string;
}

export interface CreateStoredScript extends RiskyScoreApiBase {
  options: {
    id: string;
    script: {
      lang: string | 'painless' | 'expression' | 'mustache' | 'java';
      options?: Record<string, string>;
      source: string;
    };
  };
}

export interface DeleteStoredScript extends RiskyScoreApiBase {
  options: {
    id: string;
  };
}

export interface DeleteStoredScripts extends RiskyScoreApiBase {
  ids: string[];
}

export interface CreateTransform extends RiskyScoreApiBase {
  transformId: string;
  options: string | Record<string, unknown>;
}

export interface CreateTransformResult {
  transformsCreated: string[];
  errors?: Array<{
    id: string;
    error?: { name: string; output?: { payload?: { cause?: string } } };
  }>;
}

export interface StartTransforms extends RiskyScoreApiBase {
  transformIds: string[];
}

interface TransformResult {
  success: boolean;
  error?: { root_cause?: unknown; type?: string; reason?: string };
}

export type StartTransformsResult = Record<string, TransformResult>;

export interface StopTransforms extends RiskyScoreApiBase {
  transformIds: string[];
}

export type StopTransformsResult = Record<string, TransformResult>;

export interface GetTransformState extends RiskyScoreApiBase {
  transformId: string;
}

export interface GetTransformsState extends RiskyScoreApiBase {
  transformIds: string[];
}

export interface DeleteTransforms extends RiskyScoreApiBase {
  transformIds: string[];
  options?: {
    deleteDestIndex?: boolean;
    deleteDestDataView?: boolean;
    forceDelete?: boolean;
  };
}

export type DeleteTransformsResult = Record<
  string,
  {
    transformDeleted: TransformResult;
    destIndexDeleted: {
      success: boolean;
    };
    destDataViewDeleted: {
      success: boolean;
    };
  }
>;
