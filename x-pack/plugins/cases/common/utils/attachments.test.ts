/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommentAttributes } from '../api';
import { CommentType } from '../api';
import { isAlertAttachment } from './attachments';

describe('isAlertAttachment', () => {
  const alert = {
    type: CommentType.alert as const,
  } as CommentAttributes;

  const commentTypeWithoutAlert = Object.values(CommentType).filter(
    (type) => type !== CommentType.alert
  );

  it('returns false for type: alert', () => {
    expect(isAlertAttachment(alert)).toBe(true);
  });

  it.each(commentTypeWithoutAlert)('returns false for type: %s', (type) => {
    const attachment = {
      type,
    } as CommentAttributes;

    expect(isAlertAttachment(attachment)).toBe(false);
  });
});
