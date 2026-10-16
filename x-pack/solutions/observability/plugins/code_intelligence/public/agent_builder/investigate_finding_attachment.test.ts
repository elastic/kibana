/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindingItem } from '../api';
import {
  buildFindingAttachment,
  findingAttachmentId,
  investigateFinding,
} from './investigate_finding_attachment';

const finding: FindingItem = {
  id: 'finding-1',
  repository: 'chatwoot/chatwoot',
  revision: '0123456789abcdef0123456789abcdef01234567',
  finding_type: 'sensitive-data',
  signal_type: 'log',
  status: 'open',
  title: 'Phone number in health error log',
  summary: "Logs the channel's phone number.",
  log_level: 'error',
  cataloged: true,
  evidence: [
    { path: 'app/a.rb', line: 80, excerpt: 'Rails.logger.error "failed #{channel.phone_number}"' },
    { path: 'app/b.rb' },
    {},
  ],
};

describe('buildFindingAttachment', () => {
  it('builds a hidden-free text attachment that names the finding and carries its evidence', () => {
    const attachment = buildFindingAttachment(finding);

    expect(attachment).toEqual({
      id: 'code-intelligence-finding-finding-1',
      type: 'text',
      description:
        'Code Intelligence finding: Phone number in health error log (chatwoot/chatwoot)',
      data: { content: expect.any(String) },
    });
    const content = (attachment.data as { content: string }).content;
    expect(content).toContain('finding_id: finding-1');
    expect(content).toContain('status: open');
    expect(content).toContain('log_level: error');
    expect(content).toContain('cataloged: yes');
    expect(content).toContain('app/a.rb:80\nRails.logger.error "failed #{channel.phone_number}"');
    expect(content).toContain('---\napp/b.rb');
    expect(content).not.toContain('review_note');
  });

  it('includes the review note and says when there is no evidence', () => {
    const content = (
      buildFindingAttachment({ id: 'f', review_note: 'False alarm.', evidence: [] }).data as {
        content: string;
      }
    ).content;
    expect(content).toContain('review_note: False alarm.');
    expect(content).toContain('evidence:\n(none)');
    expect(findingAttachmentId({ id: 'f' })).toBe('code-intelligence-finding-f');
  });
});

describe('investigateFinding', () => {
  it('stages the attachment and confirms with a toast', () => {
    const stager = { addQuery: jest.fn() };
    const toasts = { addSuccess: jest.fn() };

    investigateFinding({ stager, toasts }, finding);

    expect(stager.addQuery).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'code-intelligence-finding-finding-1', type: 'text' })
    );
    expect(toasts.addSuccess).toHaveBeenCalledWith(
      'Added finding "Phone number in health error log" to the AI Agent'
    );
  });
});
