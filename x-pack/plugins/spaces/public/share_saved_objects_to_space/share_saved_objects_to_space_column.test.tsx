/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { act } from '@testing-library/react';
import { coreMock } from 'src/core/public/mocks';
import type { Space } from 'src/plugins/spaces_oss/common';
import { getSpacesContextWrapper } from '../spaces_context';
import { spacesManagerMock } from '../spaces_manager/mocks';
import { ShareToSpaceSavedObjectsManagementColumn } from './share_saved_objects_to_space_column';
import { ReactWrapper } from 'enzyme';

const ACTIVE_SPACE: Space = {
  id: 'default',
  name: 'Default',
  color: '#ffffff',
  disabledFeatures: [],
};
const getSpaceData = (inactiveSpaceCount: number = 0) => {
  const inactive = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel']
    .map<Space>((name) => ({
      id: name.toLowerCase(),
      name,
      color: `#123456`, // must be a valid color as `render()` is used below
      disabledFeatures: [],
    }))
    .slice(0, inactiveSpaceCount);
  const spaces = [ACTIVE_SPACE, ...inactive];
  const namespaces = spaces.map(({ id }) => id);
  return { spaces, namespaces };
};

describe('ShareToSpaceSavedObjectsManagementColumn', () => {
  const createColumn = async (spaces: Space[], namespaces: string[]) => {
    const column = new ShareToSpaceSavedObjectsManagementColumn();
    const { getStartServices } = coreMock.createSetup();
    const spacesManager = spacesManagerMock.create();
    spacesManager.getActiveSpace.mockResolvedValue(ACTIVE_SPACE);
    spacesManager.getSpaces.mockResolvedValue(spaces);

    const SpacesContext = getSpacesContextWrapper({ getStartServices, spacesManager });
    const element = column.euiColumn.render(namespaces);

    const wrapper = mountWithIntl(<SpacesContext>{element}</SpacesContext>);

    // wait for context wrapper to rerender
    await act(async () => {});
    wrapper.update();

    return wrapper;
  };

  /**
   * This node displays up to five named spaces (and an indicator for any number of unauthorized spaces) by default. The active space is
   * omitted from this list. If more than five named spaces would be displayed, the extras (along with the unauthorized spaces indicator, if
   * present) are hidden behind a button.
   * If '*' (aka "All spaces") is present, it supersedes all of the above and just displays a single badge without a button.
   */
  describe('#euiColumn.render', () => {
    function getBadgeText(wrapper: ReactWrapper) {
      return wrapper.find('EuiBadge').map((x) => x.render().text());
    }
    function getButton(wrapper: ReactWrapper) {
      return wrapper.find('EuiButtonEmpty');
    }

    describe('with only the active space', () => {
      const { spaces, namespaces } = getSpaceData();

      it('does not show badges or button', async () => {
        const wrapper = await createColumn(spaces, namespaces);

        expect(getBadgeText(wrapper)).toHaveLength(0);
        expect(getButton(wrapper)).toHaveLength(0);
      });
    });

    describe('with the active space and one inactive space', () => {
      const { spaces, namespaces } = getSpaceData(1);

      it('shows one badge without button', async () => {
        const wrapper = await createColumn(spaces, namespaces);

        expect(getBadgeText(wrapper)).toEqual(['Alpha']);
        expect(getButton(wrapper)).toHaveLength(0);
      });
    });

    describe('with the active space and five inactive spaces', () => {
      const { spaces, namespaces } = getSpaceData(5);

      it('shows badges without button', async () => {
        const wrapper = await createColumn(spaces, namespaces);

        expect(getBadgeText(wrapper)).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo']);
        expect(getButton(wrapper)).toHaveLength(0);
      });
    });

    describe('with the active space, five inactive spaces, and one unauthorized space', () => {
      const { spaces, namespaces } = getSpaceData(5);

      it('shows badges without button', async () => {
        const wrapper = await createColumn(spaces, [...namespaces, '?']);

        expect(getBadgeText(wrapper)).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', '+1']);
        expect(getButton(wrapper)).toHaveLength(0);
      });
    });

    describe('with the active space, five inactive spaces, and two unauthorized spaces', () => {
      const { spaces, namespaces } = getSpaceData(5);

      it('shows badges without button', async () => {
        const wrapper = await createColumn(spaces, [...namespaces, '?', '?']);

        expect(getBadgeText(wrapper)).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', '+2']);
        expect(getButton(wrapper)).toHaveLength(0);
      });
    });

    describe('with the active space and six inactive spaces', () => {
      const { spaces, namespaces } = getSpaceData(6);

      it('shows badges with button', async () => {
        const wrapper = await createColumn(spaces, namespaces);

        expect(getBadgeText(wrapper)).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo']);

        const button = getButton(wrapper);
        expect(button.find('FormattedMessage').props()).toEqual({
          defaultMessage: '+{count} more',
          id: 'xpack.spaces.management.shareToSpace.showMoreSpacesLink',
          values: { count: 1 },
        });

        button.simulate('click');
        const badgeText = getBadgeText(wrapper);
        expect(badgeText).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot']);
      });
    });

    describe('with the active space, six inactive spaces, and one unauthorized space', () => {
      const { spaces, namespaces } = getSpaceData(6);

      it('shows badges with button', async () => {
        const wrapper = await createColumn(spaces, [...namespaces, '?']);

        expect(getBadgeText(wrapper)).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo']);
        const button = getButton(wrapper);
        expect(button.find('FormattedMessage').props()).toEqual({
          defaultMessage: '+{count} more',
          id: 'xpack.spaces.management.shareToSpace.showMoreSpacesLink',
          values: { count: 2 },
        });

        button.simulate('click');
        const badgeText = getBadgeText(wrapper);
        expect(badgeText).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', '+1']);
      });
    });

    describe('with the active space, six inactive spaces, and two unauthorized spaces', () => {
      const { spaces, namespaces } = getSpaceData(6);

      it('shows badges with button', async () => {
        const wrapper = await createColumn(spaces, [...namespaces, '?', '?']);

        expect(getBadgeText(wrapper)).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo']);
        const button = getButton(wrapper);
        expect(button.find('FormattedMessage').props()).toEqual({
          defaultMessage: '+{count} more',
          id: 'xpack.spaces.management.shareToSpace.showMoreSpacesLink',
          values: { count: 3 },
        });

        button.simulate('click');
        const badgeText = getBadgeText(wrapper);
        expect(badgeText).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', '+2']);
      });
    });

    describe('with only "all spaces"', () => {
      it('shows one badge without button', async () => {
        const wrapper = await createColumn([], ['*']);

        expect(getBadgeText(wrapper)).toEqual(['* All spaces']);
        expect(getButton(wrapper)).toHaveLength(0);
      });
    });

    describe('with "all spaces", the active space, six inactive spaces, and one unauthorized space', () => {
      // same as assertions 'with only "all spaces"' test case; if "all spaces" is present, it supersedes everything else
      const { spaces, namespaces } = getSpaceData(6);

      it('shows one badge without button', async () => {
        const wrapper = await createColumn(spaces, ['*', ...namespaces, '?']);

        expect(getBadgeText(wrapper)).toEqual(['* All spaces']);
        expect(getButton(wrapper)).toHaveLength(0);
      });
    });
  });
});
