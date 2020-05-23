/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimelinesPageComponent } from './timelines_page';
import { useKibana } from '../../lib/kibana';
import { shallow, ShallowWrapper } from 'enzyme';
import React from 'react';
import ApolloClient from 'apollo-client';

jest.mock('../../pages/overview/events_by_dataset');

jest.mock('../../lib/kibana', () => {
  return {
    useKibana: jest.fn(),
  };
});
describe('TimelinesPageComponent', () => {
  const mockAppollloClient = {} as ApolloClient<object>;
  let wrapper: ShallowWrapper;

  describe('If the user is authorised', () => {
    beforeAll(() => {
      ((useKibana as unknown) as jest.Mock).mockReturnValue({
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
      wrapper = shallow(<TimelinesPageComponent apolloClient={mockAppollloClient} />);
    });

    afterAll(() => {
      ((useKibana as unknown) as jest.Mock).mockReset();
    });

    test('should not show the import timeline modal by default', () => {
      expect(
        wrapper.find('[data-test-subj="stateful-open-timeline"]').prop('importDataModalToggle')
      ).toEqual(false);
    });

    test('should show the import timeline button', () => {
      expect(wrapper.find('[data-test-subj="open-import-data-modal-btn"]').exists()).toEqual(true);
    });

    test('should show the import timeline modal after user clicking on the button', () => {
      wrapper.find('[data-test-subj="open-import-data-modal-btn"]').simulate('click');
      expect(
        wrapper.find('[data-test-subj="stateful-open-timeline"]').prop('importDataModalToggle')
      ).toEqual(true);
    });
  });

  describe('If the user is not authorised', () => {
    beforeAll(() => {
      ((useKibana as unknown) as jest.Mock).mockReturnValue({
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
      wrapper = shallow(<TimelinesPageComponent apolloClient={mockAppollloClient} />);
    });

    afterAll(() => {
      ((useKibana as unknown) as jest.Mock).mockReset();
    });
    test('should not show the import timeline modal by default', () => {
      expect(
        wrapper.find('[data-test-subj="stateful-open-timeline"]').prop('importDataModalToggle')
      ).toEqual(false);
    });

    test('should not show the import timeline button', () => {
      expect(wrapper.find('[data-test-subj="open-import-data-modal-btn"]').exists()).toEqual(false);
    });
  });
});
