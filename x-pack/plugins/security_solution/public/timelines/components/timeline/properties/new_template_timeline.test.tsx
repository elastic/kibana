/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { mount, ReactWrapper } from 'enzyme';
import React from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';

import {
  mockGlobalState,
  apolloClientObservable,
  SUB_PLUGINS_REDUCER,
  kibanaObservable,
  createSecuritySolutionStorageMock,
} from '../../../../common/mock';
import { createStore, State } from '../../../../common/store';
import { useKibana } from '../../../../common/lib/kibana';
import { NewTemplateTimeline } from './new_template_timeline';

jest.mock('../../../../common/lib/kibana', () => {
  return {
    useKibana: jest.fn(),
  };
});

describe('NewTemplateTimeline', () => {
  const state: State = mockGlobalState;
  const { storage } = createSecuritySolutionStorageMock();
  const store = createStore(
    state,
    SUB_PLUGINS_REDUCER,
    apolloClientObservable,
    kibanaObservable,
    storage
  );
  const mockClosePopover = jest.fn();
  const mockTitle = 'NEW_TIMELINE';
  let wrapper: ReactWrapper;

  describe('render if CRUD', () => {
    beforeAll(() => {
      (useKibana as jest.Mock).mockReturnValue({
        services: {
          application: {
            capabilities: {
              siem: {
                crud: true,
              },
            },
          },
        },
      });

      afterAll(() => {
        (useKibana as jest.Mock).mockReset();
      });

      wrapper = mount(
        <ReduxStoreProvider store={store}>
          <NewTemplateTimeline outline={true} closeGearMenu={mockClosePopover} title={mockTitle} />
        </ReduxStoreProvider>
      );
    });

    test('render with iconType', () => {
      expect(
        wrapper
          .find('[data-test-subj="template-timeline-new-with-border"]')
          .first()
          .prop('iconType')
      ).toEqual('plusInCircle');
    });

    test('render with onClick', () => {
      expect(
        wrapper.find('[data-test-subj="template-timeline-new-with-border"]').first().prop('onClick')
      ).toBeTruthy();
    });
  });

  describe('If no CRUD', () => {
    beforeAll(() => {
      (useKibana as jest.Mock).mockReturnValue({
        services: {
          application: {
            capabilities: {
              siem: {
                crud: false,
              },
            },
          },
        },
      });

      wrapper = mount(
        <ReduxStoreProvider store={store}>
          <NewTemplateTimeline outline={true} closeGearMenu={mockClosePopover} title={mockTitle} />
        </ReduxStoreProvider>
      );
    });

    afterAll(() => {
      (useKibana as jest.Mock).mockReset();
    });

    test('no render', () => {
      expect(
        wrapper.find('[data-test-subj="template-timeline-new-with-border"]').exists()
      ).toBeFalsy();
    });
  });
});
