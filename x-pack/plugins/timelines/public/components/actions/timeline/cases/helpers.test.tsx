/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import 'jest-styled-components';
import type { MockedKeys } from '@kbn/utility-types/jest';
import { CoreStart } from 'kibana/public';
import { coreMock } from 'src/core/public/mocks';

import { createUpdateSuccessToaster } from './helpers';
import { Case } from '../../../../../../cases/common';

// const mockToasts = jest.fn();
// jest.mock('../../../../../../../../src/plugins/kibana_react/public', () => ({
//   useKibana: () => ({
//     services: {
//       notifications: {
//         toasts: mockToasts,
//       },
//     },
//   }),
//   toMountPoint: jest.fn(),
// }));

let mockCoreStart: MockedKeys<CoreStart>;

const theCase = {
  id: 'case-id',
  title: 'My case',
  settings: {
    syncAlerts: true,
  },
} as Case;

describe('helpers', () => {
  beforeEach(() => {
    mockCoreStart = coreMock.createStart();
  });
  const onViewCaseClick = jest.fn();

  describe('createUpdateSuccessToaster', () => {
    it('creates the correct toast when the sync alerts is on', () => {
      const { id, text, title, ...toast } = createUpdateSuccessToaster(
        mockCoreStart.notifications.toasts,
        theCase,
        onViewCaseClick
      );
      const mountedTitle = mount(<>{title}</>);

      expect(toast).toEqual({
        color: 'success',
        iconType: 'check',
      });
      expect(mountedTitle).toMatchInlineSnapshot(`
        .c0 {
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        <styled.span>
          <span
            className="c0"
          >
            An alert has been added to "My case"
          </span>
        </styled.span>
      `);
    });
  });
});
