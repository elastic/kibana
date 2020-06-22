/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow, ShallowWrapper } from 'enzyme';
import React from 'react';

import { useKibana } from '../../common/lib/kibana';
import { TimelinesPageComponent } from './timelines_page';
import { disableTemplate } from '../../../common/constants';

jest.mock('../../overview/components/events_by_dataset');

jest.mock('../../common/lib/kibana', () => {
  return {
    useKibana: jest.fn(),
  };
});

describe('TimelinesPageComponent', () => {
  let wrapper: ShallowWrapper;

  describe('If the user is authorized', () => {
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
      wrapper = shallow(<TimelinesPageComponent />);
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

    test('it renders create timelin btn', () => {
      expect(wrapper.find('[data-test-subj="create-default-btn"]').exists()).toBeTruthy();
    });

    /*
     * CreateTemplateTimelineBtn
     * Remove the comment here to enable CreateTemplateTimelineBtn
     */
    test('it renders no create template timelin btn', () => {
      expect(wrapper.find('[data-test-subj="create-template-btn"]').exists()).toEqual(
        !disableTemplate
      );
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
      wrapper = shallow(<TimelinesPageComponent />);
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
