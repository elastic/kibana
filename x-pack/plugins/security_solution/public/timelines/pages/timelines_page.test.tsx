/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ShallowWrapper } from 'enzyme';
import { shallow } from 'enzyme';
import React from 'react';
import { useKibana } from '../../common/lib/kibana';
import { TimelinesPage } from './timelines_page';
import { useCreateTimeline } from '../hooks/use_create_timeline';

jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');

  return {
    ...originalModule,
    useParams: jest.fn().mockReturnValue({
      tabName: 'default',
    }),
  };
});
jest.mock('../../overview/components/events_by_dataset');
jest.mock('../../common/containers/sourcerer', () => {
  const originalModule = jest.requireActual('../../common/containers/sourcerer');

  return {
    ...originalModule,
    useSourcererDataView: jest.fn().mockReturnValue({
      indicesExist: true,
    }),
  };
});
jest.mock('../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../common/lib/kibana');

  return {
    ...originalModule,
    useKibana: jest.fn(),
  };
});
jest.mock('../hooks/use_create_timeline');

describe('TimelinesPage', () => {
  let wrapper: ShallowWrapper;

  (useCreateTimeline as jest.Mock).mockReturnValue(jest.fn());

  describe('If the user is authorized', () => {
    beforeAll(() => {
      (useKibana as unknown as jest.Mock).mockReturnValue({
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
      wrapper = shallow(<TimelinesPage />);
    });

    afterAll(() => {
      (useKibana as unknown as jest.Mock).mockReset();
    });

    test('should not show the import timeline modal by default', () => {
      expect(
        wrapper.find('[data-test-subj="stateful-open-timeline"]').prop('importDataModalToggle')
      ).toEqual(false);
    });

    test('should show the import timeline button', () => {
      expect(wrapper.find('[data-test-subj="timelines-page-open-import-data"]').exists()).toEqual(
        true
      );
    });

    test.skip('should show the import timeline modal after user clicking on the button', () => {
      wrapper.find('[data-test-subj="timelines-page-open-import-data"]').simulate('click');
      expect(
        wrapper.find('[data-test-subj="stateful-open-timeline"]').prop('importDataModalToggle')
      ).toEqual(true);
    });

    test('it renders create timeline btn', () => {
      expect(
        wrapper.find('[data-test-subj="timelines-page-create-new-timeline"]').exists()
      ).toBeTruthy();
    });

    test('it renders no create timeline template btn', () => {
      expect(
        wrapper.find('[data-test-subj="timelines-page-create-new-timeline-timeline"]').exists()
      ).toBeFalsy();
    });
  });

  describe('If the user is not authorized', () => {
    beforeAll(() => {
      (useKibana as unknown as jest.Mock).mockReturnValue({
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
      wrapper = shallow(<TimelinesPage />);
    });

    afterAll(() => {
      (useKibana as unknown as jest.Mock).mockReset();
    });
    test('should not show the import timeline modal by default', () => {
      expect(
        wrapper.find('[data-test-subj="stateful-open-timeline"]').prop('importDataModalToggle')
      ).toEqual(false);
    });

    test('should not show the import timeline button', () => {
      expect(wrapper.find('[data-test-subj="timelines-page-open-import-data"]').exists()).toEqual(
        false
      );
    });
  });
});
