/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface IdleLoadingProgress {
  progress: 'idle';
}

interface RunningLoadingProgress<Parameters> {
  progress: 'running';
  time: number;
  parameters: Parameters;
}

export type LoadingProgress<Parameters> = IdleLoadingProgress | RunningLoadingProgress<Parameters>;

export const isIdleLoadingProgress = <P>(
  loadingProgress: LoadingProgress<P>
): loadingProgress is IdleLoadingProgress => loadingProgress.progress === 'idle';

export const isRunningLoadingProgress = <P>(
  loadingProgress: LoadingProgress<P>
): loadingProgress is RunningLoadingProgress<P> => loadingProgress.progress === 'running';

export const createIdleProgressReducer = <Parameters>() => (
  state: LoadingProgress<Parameters>
): IdleLoadingProgress => ({
  progress: 'idle',
});

export const createRunningProgressReducer = <Parameters>() => (
  state: LoadingProgress<Parameters>,
  parameters: Parameters
): RunningLoadingProgress<Parameters> => ({
  parameters,
  progress: 'running',
  time: Date.now(),
});
