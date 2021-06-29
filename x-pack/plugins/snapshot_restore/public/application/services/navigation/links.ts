/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function linkToHome() {
  return `/`;
}

export function linkToRepositories() {
  return `/repositories`;
}

export function linkToRepository(repositoryName: string) {
  return encodeURI(`/repositories/${encodeURIComponent(repositoryName)}`);
}

export function linkToEditRepository(repositoryName: string) {
  return encodeURI(`/edit_repository/${encodeURIComponent(repositoryName)}`);
}

export function linkToAddRepository(redirect?: string) {
  return encodeURI(`/add_repository${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`);
}

export function linkToSnapshots(repositoryName?: string, policyName?: string) {
  if (repositoryName) {
    return encodeURI(`/snapshots?repository=${encodeURIComponent(repositoryName)}`);
  }
  if (policyName) {
    return encodeURI(`/snapshots?policy=${encodeURIComponent(policyName)}`);
  }
  return `/snapshots`;
}

export function linkToSnapshot(repositoryName: string, snapshotName: string) {
  return encodeURI(
    `/snapshots/${encodeURIComponent(repositoryName)}/${encodeURIComponent(snapshotName)}`
  );
}

export function linkToRestoreSnapshot(repositoryName: string, snapshotName: string) {
  return encodeURI(
    `/restore/${encodeURIComponent(repositoryName)}/${encodeURIComponent(snapshotName)}`
  );
}

export function linkToPolicies() {
  return `/policies`;
}

export function linkToPolicy(policyName: string) {
  return encodeURI(`/policies/${encodeURIComponent(policyName)}`);
}

export function linkToEditPolicy(policyName: string) {
  return encodeURI(`/edit_policy/${encodeURIComponent(policyName)}`);
}

export function linkToAddPolicy() {
  return `/add_policy`;
}

export function linkToRestoreStatus() {
  return `/restore_status`;
}
