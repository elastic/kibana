/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FrameworkRequest } from '../framework';

import { convertStringToBase64, getExistingPrepackagedTimelines } from './saved_object';

describe('saved_object', () => {
  describe('convertStringToBase64', () => {
    test('it should base 64 encode a string such as the word "Frank"', () => {
      expect(convertStringToBase64('Frank')).toBe('RnJhbms=');
    });

    test('it should base 64 encode a large string such as the "Some very long string for you"', () => {
      expect(convertStringToBase64('Some very long string for you')).toBe(
        'U29tZSB2ZXJ5IGxvbmcgc3RyaW5nIGZvciB5b3U='
      );
    });

    test('it should base 64 encode a empty string as an empty string', () => {
      expect(convertStringToBase64('')).toBe('');
    });
  });
});

describe('getExistingPrepackagedTimelines', () => {
  const mockFindSavedObject = jest.fn();
  const mockRequest = ({
    user: {
      username: 'username',
    },
    context: {
      core: {
        savedObjects: {
          client: {
            find: mockFindSavedObject,
          },
        },
      },
    },
  } as unknown) as FrameworkRequest;

  beforeEach(() => {
    mockFindSavedObject.mockClear();
  });
  test('should send correct options if countsOnly is true', () => {
    const contsOnly = true;
    getExistingPrepackagedTimelines(mockRequest, contsOnly);
    expect(mockFindSavedObject).toBeCalledWith({
      filter:
        'siem-ui-timeline.attributes.timelineType: template and not siem-ui-timeline.attributes.status: draft and siem-ui-timeline.attributes.status: immutable and siem-ui-timeline.attributes.createdBy: "Elastic"',
      page: 1,
      perPage: 1,
      type: 'siem-ui-timeline',
    });
  });

  test('should send correct options if countsOnly is false', () => {
    const contsOnly = false;
    getExistingPrepackagedTimelines(mockRequest, contsOnly);
    expect(mockFindSavedObject).toBeCalledWith({
      filter:
        'siem-ui-timeline.attributes.timelineType: template and not siem-ui-timeline.attributes.status: draft and siem-ui-timeline.attributes.status: immutable and siem-ui-timeline.attributes.createdBy: "Elastic"',
      type: 'siem-ui-timeline',
    });
  });

  test('should send correct options if pageInfo is given', () => {
    const contsOnly = false;
    const pageInfo = {
      pageSize: 10,
      pageIndex: 1,
    };
    getExistingPrepackagedTimelines(mockRequest, contsOnly, pageInfo);
    expect(mockFindSavedObject).toBeCalledWith({
      filter:
        'siem-ui-timeline.attributes.timelineType: template and not siem-ui-timeline.attributes.status: draft and siem-ui-timeline.attributes.status: immutable and siem-ui-timeline.attributes.createdBy: "Elastic"',
      page: 1,
      perPage: 10,
      type: 'siem-ui-timeline',
    });
  });
});
