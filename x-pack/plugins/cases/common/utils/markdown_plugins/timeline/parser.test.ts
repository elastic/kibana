/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RemarkParser } from '@elastic/eui/src/components/markdown_editor/markdown_types';
import { TimelineLinkParser } from './parser';
import { TimelineSerializer } from './serializer';
import { Eat } from './types';

describe('timeline parser', () => {
  describe('TimelineLinkParser', () => {
    let mockRemark: RemarkParser;
    let mockEat: Eat;

    beforeEach(() => {
      mockRemark = createMockRemark();
      mockEat = createMockEat();
    });

    it('extracts the title', () => {
      const parser = new TimelineLinkParser(mockRemark, createLink('jon title', '123'), mockEat);
      const { title } = parser.parse();

      expect(title).toBe('jon title');
    });

    it('extracts the url', () => {
      const parser = new TimelineLinkParser(mockRemark, createLink('jon title', '123'), mockEat);
      const { url } = parser.parse();

      expect(url).toBe(`https://a.com/security/timelines?timeline=(id:%27123%27,isOpen:!t)`);
    });

    it('extracts the id', () => {
      const parser = new TimelineLinkParser(mockRemark, createLink('jon title', '123'), mockEat);
      const { id } = parser.parse();

      expect(id).toBe('123');
    });
  });
});

function createMockRemark(): RemarkParser {
  return {
    file: jest.fn(),
  } as unknown as RemarkParser;
}

function createMockEat(): Eat {
  const mockEat = function () {};
  mockEat.now = jest.fn();

  return mockEat;
}

function createLink(title: string, id: string) {
  return TimelineSerializer({
    title,
    url: `https://a.com/security/timelines?timeline=(id:%27${id}%27,isOpen:!t)`,
  });
}
