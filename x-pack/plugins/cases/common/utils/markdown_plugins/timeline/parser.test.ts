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
import * as i18n from './translations';

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

    it('throws an error when the title is missing the closing bracket', () => {
      expect(() => {
        new TimelineLinkParser(
          mockRemark,
          '[a titlehttps://a.com/security/timelines?timeline=(id:%27123%27,isOpen:!t)',
          mockEat
        ).parse();
      }).toThrow(i18n.FAILED_PARSE_NAME);
    });

    it('throws an error when the url is not contained in parentheses', () => {
      expect(() => {
        new TimelineLinkParser(
          mockRemark,
          '[a title](https://a.com/security/timelines?timeline=(id:%27123%27,isOpen:!t)',
          mockEat
        ).parse();
      }).toThrow(i18n.FAILED_PARSE_URL);
    });

    it('throws an error when the url is not valid', () => {
      expect(() => {
        new TimelineLinkParser(
          mockRemark,
          '[a title](timelines?timeline=(id:%27123%27,isOpen:!t))',
          mockEat
        ).parse();
      }).toThrow(
        i18n.FAILED_PARSE_URL_WITH_ERROR('Invalid URL: timelines?timeline=(id:%27123%27,isOpen:!t)')
      );
    });

    it('throws an error when the query parameters does not contain timeline', () => {
      expect(() => {
        new TimelineLinkParser(
          mockRemark,
          '[a title](https://a.com/security/timelines?timelines=(id:%27123%27,isOpen:!t))',
          mockEat
        ).parse();
      }).toThrow(i18n.FAILED_PARSE_URL_WITH_ERROR(i18n.FAILED_PARSE_QUERY_PARAMS));
    });

    it('throws an error when it fails to decode the query parameters', () => {
      expect(() => {
        new TimelineLinkParser(
          mockRemark,
          '[a title](https://a.com/security/timelines?timeline=(id:%27123,isOpen:!t))',
          mockEat
        ).parse();
      }).toThrow(
        i18n.FAILED_PARSE_URL_WITH_ERROR('rison decoder error: invalid string escape: "!t"')
      );
    });

    it('throws an error when it fails to find the id field in the query parameters', () => {
      expect(() => {
        new TimelineLinkParser(
          mockRemark,
          '[a title](https://a.com/security/timelines?timeline=(notidfield:%27123%27,isOpen:!t))',
          mockEat
        ).parse();
      }).toThrow(i18n.FAILED_PARSE_URL_WITH_ERROR(i18n.NO_ID_FIELD));
    });
  });
});

function createMockRemark(): RemarkParser {
  return {
    file: { info: jest.fn() },
  } as unknown as RemarkParser;
}

function createMockEat(): Eat {
  const mockEat = function () {};
  mockEat.now = jest.fn(() => ({
    line: 0,
  }));

  return mockEat;
}

function createLink(title: string, id: string) {
  return TimelineSerializer({
    title,
    url: `https://a.com/security/timelines?timeline=(id:%27${id}%27,isOpen:!t)`,
  });
}
