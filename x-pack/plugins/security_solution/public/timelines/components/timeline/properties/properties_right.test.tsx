/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, ReactWrapper } from 'enzyme';
import React from 'react';

import { PropertiesRight } from './properties_right';
import { useKibana } from '../../../../common/lib/kibana';
import { TimelineStatus, TimelineType } from '../../../../../common/types/timeline';

jest.mock('../../../../common/lib/kibana', () => {
  return {
    useKibana: jest.fn(),
    useUiSetting$: jest.fn().mockReturnValue([]),
  };
});

jest.mock('./new_template_timeline', () => {
  return {
    NewTemplateTimeline: jest.fn(() => <div data-test-subj="create-template-btn" />),
  };
});

jest.mock('./helpers', () => {
  return {
    Description: jest.fn().mockReturnValue(<div data-test-subj="Description" />),
    ExistingCase: jest.fn().mockReturnValue(<div data-test-subj="ExistingCase" />),
    NewCase: jest.fn().mockReturnValue(<div data-test-subj="NewCase" />),
    NewTimeline: jest.fn().mockReturnValue(<div data-test-subj="create-default-btn" />),
    NotesButton: jest.fn().mockReturnValue(<div data-test-subj="NotesButton" />),
  };
});

jest.mock('../../../../common/components/inspect', () => {
  return {
    InspectButton: jest.fn().mockReturnValue(<div />),
    InspectButtonContainer: jest.fn(({ children }) => <div>{children}</div>),
  };
});

describe('Properties Right', () => {
  let wrapper: ReactWrapper;
  const props = {
    onButtonClick: jest.fn(),
    onClosePopover: jest.fn(),
    showActions: true,
    createTimeline: jest.fn(),
    timelineId: 'timelineId',
    isDataInTimeline: false,
    showNotes: false,
    showNotesFromWidth: false,
    showDescription: false,
    showUsersView: false,
    usersViewing: [],
    description: 'desc',
    updateDescription: jest.fn(),
    associateNote: jest.fn(),
    getNotesByIds: jest.fn(),
    noteIds: [],
    onToggleShowNotes: jest.fn(),
    onCloseTimelineModal: jest.fn(),
    onOpenCaseModal: jest.fn(),
    onOpenTimelineModal: jest.fn(),
    status: TimelineStatus.active,
    showTimelineModal: false,
    timelineType: TimelineType.default,
    title: 'title',
    updateNote: jest.fn(),
  };

  describe('with crud', () => {
    describe('render', () => {
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
        wrapper = mount(<PropertiesRight {...props} />);
      });

      afterAll(() => {
        (useKibana as jest.Mock).mockReset();
      });

      test('it renders settings-gear', () => {
        expect(wrapper.find('[data-test-subj="settings-gear"]').exists()).toBeTruthy();
      });

      test('it renders create timeline btn', () => {
        expect(wrapper.find('[data-test-subj="create-default-btn"]').exists()).toBeTruthy();
      });

      test('it renders create attach timeline to a case btn', () => {
        expect(wrapper.find('[data-test-subj="NewCase"]').exists()).toBeTruthy();
      });

      test('it renders no NotesButton', () => {
        expect(wrapper.find('[data-test-subj="NotesButton"]').exists()).not.toBeTruthy();
      });

      test('it renders no Description', () => {
        expect(wrapper.find('[data-test-subj="Description"]').exists()).not.toBeTruthy();
      });
    });

    describe('render with notes button', () => {
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
        const propsWithshowNotes = {
          ...props,
          showNotesFromWidth: true,
        };
        wrapper = mount(<PropertiesRight {...propsWithshowNotes} />);
      });

      afterAll(() => {
        (useKibana as jest.Mock).mockReset();
      });

      test('it renders NotesButton', () => {
        expect(wrapper.find('[data-test-subj="NotesButton"]').exists()).toBeTruthy();
      });
    });

    describe('render with description', () => {
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
        const propsWithshowDescription = {
          ...props,
          showDescription: true,
        };
        wrapper = mount(<PropertiesRight {...propsWithshowDescription} />);
      });

      afterAll(() => {
        (useKibana as jest.Mock).mockReset();
      });

      test('it renders Description', () => {
        expect(wrapper.find('[data-test-subj="Description"]').exists()).toBeTruthy();
      });
    });
  });

  describe('with no crud', () => {
    describe('render', () => {
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
        wrapper = mount(<PropertiesRight {...props} />);
      });

      afterAll(() => {
        (useKibana as jest.Mock).mockReset();
      });

      test('it renders settings-gear', () => {
        expect(wrapper.find('[data-test-subj="settings-gear"]').exists()).toBeTruthy();
      });

      test('it renders create timeline template btn', () => {
        expect(wrapper.find('[data-test-subj="create-template-btn"]').exists()).toEqual(true);
      });

      test('it renders create attach timeline to a case btn', () => {
        expect(wrapper.find('[data-test-subj="NewCase"]').exists()).toBeTruthy();
      });

      test('it renders no NotesButton', () => {
        expect(wrapper.find('[data-test-subj="NotesButton"]').exists()).not.toBeTruthy();
      });

      test('it renders no Description', () => {
        expect(wrapper.find('[data-test-subj="Description"]').exists()).not.toBeTruthy();
      });
    });

    describe('render with notes button', () => {
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
        const propsWithshowNotes = {
          ...props,
          showNotesFromWidth: true,
        };
        wrapper = mount(<PropertiesRight {...propsWithshowNotes} />);
      });

      afterAll(() => {
        (useKibana as jest.Mock).mockReset();
      });

      test('it renders NotesButton', () => {
        expect(wrapper.find('[data-test-subj="NotesButton"]').exists()).toBeTruthy();
      });
    });

    describe('render with description', () => {
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
        const propsWithshowDescription = {
          ...props,
          showDescription: true,
        };
        wrapper = mount(<PropertiesRight {...propsWithshowDescription} />);
      });

      afterAll(() => {
        (useKibana as jest.Mock).mockReset();
      });

      test('it renders Description', () => {
        expect(wrapper.find('[data-test-subj="Description"]').exists()).toBeTruthy();
      });
    });
  });
});
