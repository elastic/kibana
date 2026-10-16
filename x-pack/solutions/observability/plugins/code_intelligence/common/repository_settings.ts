/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Default name of the index that holds one settings document per repository. */
export const DEFAULT_SETTINGS_INDEX = 'code-intelligence-settings';

/** Revision used when a repository document does not name one: the remote default branch. */
export const DEFAULT_REPOSITORY_REF = 'HEAD';

export const MAX_REPOSITORY_IDENTITY_LENGTH = 256;
export const MAX_REMOTE_URL_LENGTH = 2_048;
export const MAX_REVISION_LENGTH = 255;
export const MAX_CONNECTOR_ID_LENGTH = 1_024;

/** Repository settings as stored in the settings index and returned by the repositories API. */
export interface RepositorySettings {
  readonly repository: string;
  readonly remoteUrl: string;
  readonly defaultRef: string;
  readonly enabled: boolean;
  /** Reserved for connector-backed Git credentials; not used for extraction yet. */
  readonly githubConnectorId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Fields a caller supplies when adding or replacing one repository. */
export interface RepositorySettingsInput {
  readonly repository: string;
  readonly remoteUrl: string;
  readonly defaultRef?: string;
  readonly enabled?: boolean;
  readonly githubConnectorId?: string;
}

/** Names the input field a validation problem belongs to, so the form can mark it. */
export type RepositorySettingsField =
  | 'repository'
  | 'remoteUrl'
  | 'defaultRef'
  | 'githubConnectorId';

export interface RepositorySettingsProblem {
  readonly field: RepositorySettingsField;
  readonly message: string;
}

const REPOSITORY_IDENTITY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

/** Detects control characters unsafe in line-oriented Git output. */
export const containsControlCharacter = (value: string): boolean =>
  Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint < 32 || codePoint === 127);
  });

/** Accepts `<owner>/<repo>` identities made of Git-hosting-safe characters. */
export const isRepositoryIdentity = (value: string): boolean =>
  value.length >= 3 &&
  value.length <= MAX_REPOSITORY_IDENTITY_LENGTH &&
  REPOSITORY_IDENTITY.test(value);

/** Rejects revision-expression syntax before it reaches Git. */
export const isSafeRevision = (revision: string): boolean =>
  revision.length <= MAX_REVISION_LENGTH &&
  !revision.startsWith('-') &&
  !revision.includes('..') &&
  !revision.includes('@{') &&
  !revision.endsWith('.') &&
  !revision.includes('//') &&
  /^(?:refs\/(?:heads|tags)\/)?[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(revision);

/**
 * Accepts only credential-free `https://` remotes. Credentials travel as command environment,
 * never inside the URL, because sandbox command text is persisted with workspace snapshots.
 */
export const isAllowedRemoteUrl = (value: string): boolean => {
  if (value.length === 0 || value.length > MAX_REMOTE_URL_LENGTH) return false;
  if (containsControlCharacter(value) || /\s/.test(value)) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    url.protocol === 'https:' &&
    url.hostname.length > 0 &&
    url.username === '' &&
    url.password === '' &&
    !value.slice('https://'.length).split('/')[0].includes('@') &&
    url.search === '' &&
    url.hash === '' &&
    url.pathname.length > 1
  );
};

/** Returns every problem with a repository settings input; an empty list means it is valid. */
export const validateRepositorySettings = (
  input: RepositorySettingsInput
): readonly RepositorySettingsProblem[] => {
  const problems: RepositorySettingsProblem[] = [];
  if (!isRepositoryIdentity(input.repository)) {
    problems.push({
      field: 'repository',
      message:
        'Repository must look like owner/name and use only letters, digits, ".", "_", or "-".',
    });
  }
  if (!isAllowedRemoteUrl(input.remoteUrl)) {
    problems.push({
      field: 'remoteUrl',
      message:
        'Remote URL must be an https:// URL without a user name, password, query, or fragment.',
    });
  }
  const defaultRef = input.defaultRef ?? DEFAULT_REPOSITORY_REF;
  if (defaultRef !== DEFAULT_REPOSITORY_REF && !isSafeRevision(defaultRef)) {
    problems.push({
      field: 'defaultRef',
      message: 'Default ref must be HEAD, a branch, a tag, or a commit SHA.',
    });
  }
  if (
    input.githubConnectorId !== undefined &&
    (input.githubConnectorId.length === 0 ||
      input.githubConnectorId.length > MAX_CONNECTOR_ID_LENGTH ||
      containsControlCharacter(input.githubConnectorId))
  ) {
    problems.push({ field: 'githubConnectorId', message: 'GitHub connector ID is invalid.' });
  }
  return problems;
};
