/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Assign, Omit } from 'utility-types';

export function leftJoin<
  TL extends object,
  K extends keyof TL,
  TR extends Pick<TL, K>
>(leftRecords: TL[], matchKey: K, rightRecords: TR[]) {
  const rightLookup = new Map(
    rightRecords.map((record) => [record[matchKey], record])
  );
  return leftRecords.map((record) => {
    const matchProp = (record[matchKey] as unknown) as TR[K];
    const matchingRightRecord = rightLookup.get(matchProp);
    return { ...record, ...matchingRightRecord };
  }) as Array<Assign<TL, Partial<Omit<TR, K>>>>;
}
