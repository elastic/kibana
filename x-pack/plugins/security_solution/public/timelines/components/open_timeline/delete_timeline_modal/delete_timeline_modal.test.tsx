/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { useParams } from 'react-router-dom';

import { DeleteTimelineModal } from './delete_timeline_modal';

import * as i18n from '../translations';
import { TimelineType } from '../../../../../common/types/timeline';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useParams: jest.fn(),
  };
});

describe('DeleteTimelineModal', () => {
  beforeAll(() => {
    (useParams as jest.Mock).mockReturnValue({ tabName: TimelineType.default });
  });

  test('it renders the expected title when a timeline is selected', () => {
    const wrapper = mountWithIntl(
      <DeleteTimelineModal
        title={'Privilege Escalation'}
        onDelete={jest.fn()}
        closeModal={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="title"]').first().text()).toEqual(
      'Delete "Privilege Escalation"?'
    );
  });

  test('it trims leading whitespace around the title', () => {
    const wrapper = mountWithIntl(
      <DeleteTimelineModal
        title={'    Leading and trailing whitespace    '}
        onDelete={jest.fn()}
        closeModal={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="title"]').first().text()).toEqual(
      'Delete "Leading and trailing whitespace"?'
    );
  });

  test('it displays `Untitled Timeline` in the title when title is undefined', () => {
    const wrapper = mountWithIntl(
      <DeleteTimelineModal onDelete={jest.fn()} closeModal={jest.fn()} />
    );

    expect(wrapper.find('[data-test-subj="title"]').first().text()).toEqual(
      'Delete "Untitled timeline"?'
    );
  });

  test('it displays `Untitled Timeline` in the title when title is null', () => {
    const wrapper = mountWithIntl(
      <DeleteTimelineModal onDelete={jest.fn()} title={null} closeModal={jest.fn()} />
    );

    expect(wrapper.find('[data-test-subj="title"]').first().text()).toEqual(
      'Delete "Untitled timeline"?'
    );
  });

  test('it displays `Untitled Timeline` in the title when title is just whitespace', () => {
    const wrapper = mountWithIntl(
      <DeleteTimelineModal onDelete={jest.fn()} title={'    '} closeModal={jest.fn()} />
    );

    expect(wrapper.find('[data-test-subj="title"]').first().text()).toEqual(
      'Delete "Untitled timeline"?'
    );
  });

  test('it renders a deletion warning', () => {
    const wrapper = mountWithIntl(
      <DeleteTimelineModal
        title="Privilege Escalation"
        onDelete={jest.fn()}
        closeModal={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="warning"]').first().text()).toEqual(
      i18n.DELETE_TIMELINE_WARNING
    );
  });

  test('it invokes closeModal when the Cancel button is clicked', () => {
    const closeModal = jest.fn();

    const wrapper = mountWithIntl(
      <DeleteTimelineModal
        title="Privilege Escalation"
        onDelete={jest.fn()}
        closeModal={closeModal}
      />
    );

    wrapper.find('[data-test-subj="confirmModalCancelButton"]').first().simulate('click');

    expect(closeModal).toBeCalled();
  });

  test('it invokes onDelete when the Delete button is clicked', () => {
    const onDelete = jest.fn();

    const wrapper = mountWithIntl(
      <DeleteTimelineModal
        title="Privilege Escalation"
        onDelete={onDelete}
        closeModal={jest.fn()}
      />
    );

    wrapper.find('[data-test-subj="confirmModalConfirmButton"]').first().simulate('click');

    expect(onDelete).toBeCalled();
  });
});

describe('DeleteTimelineTemplateModal', () => {
  beforeAll(() => {
    (useParams as jest.Mock).mockReturnValue({ tabName: TimelineType.template });
  });

  test('it renders a deletion warning', () => {
    const wrapper = mountWithIntl(
      <DeleteTimelineModal
        title="Privilege Escalation"
        onDelete={jest.fn()}
        closeModal={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="warning"]').first().text()).toEqual(
      i18n.DELETE_TIMELINE_TEMPLATE_WARNING
    );
  });
});
