/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { isEmpty } from 'lodash';
import { OWNERS } from '../constants';
import type { HttpApiTagOperation, Owner } from '../constants/types';

export const CaseFileMetadataRt = rt.type({
  // TODO: do we want this as an array?
  caseId: rt.string,
  // TODO: do we want this as an array?
  owner: rt.array(rt.string),
});

export type CaseFileMetadata = rt.TypeOf<typeof CaseFileMetadataRt>;

export const constructFilesHttpOperationTag = (owner: Owner, operation: HttpApiTagOperation) => {
  return `${owner}FilesCases${operation}`;
};

const FILE_KIND_DELIMITER = 'FilesCases';

export const constructFileKindIdByOwner = (owner: Owner) => `${owner}${FILE_KIND_DELIMITER}`;

export const constructOwnerFromFileKind = (fileKind: string): Owner | undefined => {
  const splitString = fileKind.split(FILE_KIND_DELIMITER);

  if (splitString.length === 2 && isEmpty(splitString[1]) && isValidOwner(splitString[0])) {
    return splitString[0];
  }
};

const isValidOwner = (ownerToValidate: string): ownerToValidate is Owner => {
  const foundOwner = OWNERS.find((validOwner) => validOwner === ownerToValidate);

  return foundOwner !== undefined;
};
