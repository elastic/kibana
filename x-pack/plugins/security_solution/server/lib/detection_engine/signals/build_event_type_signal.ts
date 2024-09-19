/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { BaseSignalHit, SimpleHit } from './types';
import { getField } from './utils';

export const buildEventTypeSignal = (doc: BaseSignalHit): object => {
  if (doc._source?.event != null && doc._source?.event instanceof Object) {
    return { ...doc._source!.event, kind: 'signal' };
  } else {
    return { kind: 'signal' };
  }
};

/**
 * Given a document this will return true if that document is a signal
 * document. We can't guarantee the code will call this function with a document
 * before adding the _source.event.kind = "signal" from "buildEventTypeSignal"
 * so we do basic testing to ensure that if the object has the fields of:
 * "signal.rule.id" then it will be one of our signals rather than a customer
 * overwritten signal.
 * @param doc The document which might be a signal or it might be a regular log
 */
export const isEventTypeSignal = (doc: SimpleHit): boolean => {
  const ruleId = getField(doc, 'signal.rule.id');
  return ruleId != null && typeof ruleId === 'string';
};
