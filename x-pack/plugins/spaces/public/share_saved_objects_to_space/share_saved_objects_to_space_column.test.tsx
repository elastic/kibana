/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl } from '@kbn/test/jest';
import { SpacesManager } from '../spaces_manager';
import { spacesManagerMock } from '../spaces_manager/mocks';
import { ShareToSpaceSavedObjectsManagementColumn } from './share_saved_objects_to_space_column';
import { SpaceTarget } from './types';

const ACTIVE_SPACE: SpaceTarget = {
  id: 'default',
  name: 'Default',
  color: '#ffffff',
  isActiveSpace: true,
};
const getSpaceData = (inactiveSpaceCount: number = 0) => {
  const inactive = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel']
    .map<SpaceTarget>((name) => ({
      id: name.toLowerCase(),
      name,
      color: `#123456`, // must be a valid color as `render()` is used below
      isActiveSpace: false,
    }))
    .slice(0, inactiveSpaceCount);
  const spaceTargets = [ACTIVE_SPACE, ...inactive];
  const namespaces = spaceTargets.map(({ id }) => id);
  return { spaceTargets, namespaces };
};

describe('ShareToSpaceSavedObjectsManagementColumn', () => {
  let spacesManager: SpacesManager;
  beforeEach(() => {
    spacesManager = spacesManagerMock.create();
  });

  const createColumn = (spaceTargets: SpaceTarget[], namespaces: string[]) => {
    const column = new ShareToSpaceSavedObjectsManagementColumn(spacesManager);
    column.data = spaceTargets.reduce(
      (acc, cur) => acc.set(cur.id, cur),
      new Map<string, SpaceTarget>()
    );
    const element = column.euiColumn.render(namespaces);
    return shallowWithIntl(element);
  };

  /**
   * This node displays up to five named spaces (and an indicator for any number of unauthorized spaces) by default. The active space is
   * omitted from this list. If more than five named spaces would be displayed, the extras (along with the unauthorized spaces indicator, if
   * present) are hidden behind a button.
   * If '*' (aka "All spaces") is present, it supersedes all of the above and just displays a single badge without a button.
   */
  describe('#euiColumn.render', () => {
    describe('with only the active space', () => {
      const { spaceTargets, namespaces } = getSpaceData();
      const wrapper = createColumn(spaceTargets, namespaces);

      it('does not show badges or button', async () => {
        const badges = wrapper.find('EuiBadge');
        expect(badges).toHaveLength(0);
        const button = wrapper.find('EuiButtonEmpty');
        expect(button).toHaveLength(0);
      });
    });

    describe('with the active space and one inactive space', () => {
      const { spaceTargets, namespaces } = getSpaceData(1);
      const wrapper = createColumn(spaceTargets, namespaces);

      it('shows one badge without button', async () => {
        const badges = wrapper.find('EuiBadge');
        expect(badges).toMatchInlineSnapshot(`
          <EuiBadge
            color="#123456"
          >
            Alpha
          </EuiBadge>
        `);
        const button = wrapper.find('EuiButtonEmpty');
        expect(button).toHaveLength(0);
      });
    });

    describe('with the active space and five inactive spaces', () => {
      const { spaceTargets, namespaces } = getSpaceData(5);
      const wrapper = createColumn(spaceTargets, namespaces);

      it('shows badges without button', async () => {
        const badgeText = wrapper.find('EuiBadge').map((x) => x.render().text());
        expect(badgeText).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo']);
        const button = wrapper.find('EuiButtonEmpty');
        expect(button).toHaveLength(0);
      });
    });

    describe('with the active space, five inactive spaces, and one unauthorized space', () => {
      const { spaceTargets, namespaces } = getSpaceData(5);
      const wrapper = createColumn(spaceTargets, [...namespaces, '?']);

      it('shows badges without button', async () => {
        const badgeText = wrapper.find('EuiBadge').map((x) => x.render().text());
        expect(badgeText).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', '+1']);
        const button = wrapper.find('EuiButtonEmpty');
        expect(button).toHaveLength(0);
      });
    });

    describe('with the active space, five inactive spaces, and two unauthorized spaces', () => {
      const { spaceTargets, namespaces } = getSpaceData(5);
      const wrapper = createColumn(spaceTargets, [...namespaces, '?', '?']);

      it('shows badges without button', async () => {
        const badgeText = wrapper.find('EuiBadge').map((x) => x.render().text());
        expect(badgeText).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', '+2']);
        const button = wrapper.find('EuiButtonEmpty');
        expect(button).toHaveLength(0);
      });
    });

    describe('with the active space and six inactive spaces', () => {
      const { spaceTargets, namespaces } = getSpaceData(6);
      const wrapper = createColumn(spaceTargets, namespaces);

      it('shows badges with button', async () => {
        let badgeText = wrapper.find('EuiBadge').map((x) => x.render().text());
        expect(badgeText).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo']);
        const button = wrapper.find('EuiButtonEmpty');
        expect(button.find('FormattedMessage').props()).toEqual({
          defaultMessage: '+{count} more',
          id: 'xpack.spaces.management.shareToSpace.showMoreSpacesLink',
          values: { count: 1 },
        });

        button.simulate('click');
        badgeText = wrapper.find('EuiBadge').map((x) => x.render().text());
        expect(badgeText).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot']);
      });
    });

    describe('with the active space, six inactive spaces, and one unauthorized space', () => {
      const { spaceTargets, namespaces } = getSpaceData(6);
      const wrapper = createColumn(spaceTargets, [...namespaces, '?']);

      it('shows badges with button', async () => {
        let badgeText = wrapper.find('EuiBadge').map((x) => x.render().text());
        expect(badgeText).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo']);
        const button = wrapper.find('EuiButtonEmpty');
        expect(button.find('FormattedMessage').props()).toEqual({
          defaultMessage: '+{count} more',
          id: 'xpack.spaces.management.shareToSpace.showMoreSpacesLink',
          values: { count: 2 },
        });

        button.simulate('click');
        badgeText = wrapper.find('EuiBadge').map((x) => x.render().text());
        expect(badgeText).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', '+1']);
      });
    });

    describe('with the active space, six inactive spaces, and two unauthorized spaces', () => {
      const { spaceTargets, namespaces } = getSpaceData(6);
      const wrapper = createColumn(spaceTargets, [...namespaces, '?', '?']);

      it('shows badges with button', async () => {
        let badgeText = wrapper.find('EuiBadge').map((x) => x.render().text());
        expect(badgeText).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo']);
        const button = wrapper.find('EuiButtonEmpty');
        expect(button.find('FormattedMessage').props()).toEqual({
          defaultMessage: '+{count} more',
          id: 'xpack.spaces.management.shareToSpace.showMoreSpacesLink',
          values: { count: 3 },
        });

        button.simulate('click');
        badgeText = wrapper.find('EuiBadge').map((x) => x.render().text());
        expect(badgeText).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', '+2']);
      });
    });

    describe('with only "all spaces"', () => {
      const wrapper = createColumn([], ['*']);

      it('shows one badge without button', async () => {
        const badgeText = wrapper.find('EuiBadge').map((x) => x.render().text());
        expect(badgeText).toEqual(['* All spaces']);
        const button = wrapper.find('EuiButtonEmpty');
        expect(button).toHaveLength(0);
      });
    });

    describe('with "all spaces", the active space, six inactive spaces, and one unauthorized space', () => {
      // same as assertions 'with only "all spaces"' test case; if "all spaces" is present, it supersedes everything else
      const { spaceTargets, namespaces } = getSpaceData(6);
      const wrapper = createColumn(spaceTargets, ['*', ...namespaces, '?']);

      it('shows one badge without button', async () => {
        const badgeText = wrapper.find('EuiBadge').map((x) => x.render().text());
        expect(badgeText).toEqual(['* All spaces']);
        const button = wrapper.find('EuiButtonEmpty');
        expect(button).toHaveLength(0);
      });
    });
  });
});
