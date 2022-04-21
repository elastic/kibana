/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';
import type { ReactWrapper } from 'enzyme';
import React from 'react';

import { mountWithIntl } from '@kbn/test-jest-helpers';
import { coreMock } from 'src/core/public/mocks';

import type { Space } from '../../common';
import { getSpacesContextProviderWrapper } from '../spaces_context';
import { spacesManagerMock } from '../spaces_manager/mocks';
import { SpaceListInternal } from './space_list_internal';
import type { SpaceListProps } from './types';

const ACTIVE_SPACE: Space = {
  id: 'default',
  name: 'Default',
  initials: 'D!', // so it can be differentiated from 'Delta'
  disabledFeatures: [],
};
const getSpaceData = (inactiveSpaceCount: number = 0) => {
  const inactive = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel']
    .map<Space>((name) => {
      const id = name.toLowerCase();
      return { id, name, disabledFeatures: [`${id}-feature`] };
    })
    .slice(0, inactiveSpaceCount);
  const spaces = [ACTIVE_SPACE, ...inactive];
  const namespaces = spaces.map(({ id }) => id);
  return { spaces, namespaces };
};

/**
 * Displays a corresponding list of spaces for a given list of saved object namespaces. It shows up to five spaces (and an indicator for any
 * number of spaces that the user is not authorized to see) by default. If more than five named spaces would be displayed, the extras (along
 * with the unauthorized spaces indicator, if present) are hidden behind a button. If '*' (aka "All spaces") is present, it supersedes all
 * of the above and just displays a single badge without a button.
 */
describe('SpaceListInternal', () => {
  const createSpaceList = async ({
    spaces,
    props,
    feature,
  }: {
    spaces: Space[];
    props: SpaceListProps;
    feature?: string;
  }) => {
    const { getStartServices } = coreMock.createSetup();
    const spacesManager = spacesManagerMock.create();
    spacesManager.getActiveSpace.mockResolvedValue(ACTIVE_SPACE);
    spacesManager.getSpaces.mockResolvedValue(spaces);

    const SpacesContext = await getSpacesContextProviderWrapper({
      getStartServices,
      spacesManager,
    });
    const wrapper = mountWithIntl(
      <SpacesContext feature={feature}>
        <SpaceListInternal {...props} />
      </SpacesContext>
    );

    // wait for context wrapper to rerender
    await act(async () => {});
    wrapper.update();

    return wrapper;
  };

  function getListText(wrapper: ReactWrapper) {
    return wrapper.find('EuiFlexItem').map((x) => x.text());
  }
  function getButton(wrapper: ReactWrapper) {
    return wrapper.find('EuiButtonEmpty');
  }
  async function getListClickTarget(wrapper: ReactWrapper) {
    return (await wrapper.find('[data-test-subj="space-avatar-alpha"]')).last();
  }

  describe('using default properties', () => {
    describe('with only the active space', () => {
      const { spaces, namespaces } = getSpaceData();

      it('does not show badges or button', async () => {
        const props = { namespaces };
        const wrapper = await createSpaceList({ spaces, props });

        expect(getListText(wrapper)).toHaveLength(0);
        expect(getButton(wrapper)).toHaveLength(0);
      });
    });

    describe('with the active space and one inactive space', () => {
      const { spaces, namespaces } = getSpaceData(1);

      it('shows one badge without button', async () => {
        const props = { namespaces };
        const wrapper = await createSpaceList({ spaces, props });

        expect(getListText(wrapper)).toEqual(['A']);
        expect(getButton(wrapper)).toHaveLength(0);
      });
    });

    describe('with the active space and five inactive spaces', () => {
      const { spaces, namespaces } = getSpaceData(5);

      it('shows badges without button', async () => {
        const props = { namespaces };
        const wrapper = await createSpaceList({ spaces, props });

        expect(getListText(wrapper)).toEqual(['A', 'B', 'C', 'D', 'E']);
        expect(getButton(wrapper)).toHaveLength(0);
      });
    });

    describe('with the active space, five inactive spaces, and one unauthorized space', () => {
      const { spaces, namespaces } = getSpaceData(5);

      it('shows badges without button', async () => {
        const props = { namespaces: [...namespaces, '?'] };
        const wrapper = await createSpaceList({ spaces, props });

        expect(getListText(wrapper)).toEqual(['A', 'B', 'C', 'D', 'E', '+1']);
        expect(getButton(wrapper)).toHaveLength(0);
      });
    });

    describe('with the active space, five inactive spaces, and two unauthorized spaces', () => {
      const { spaces, namespaces } = getSpaceData(5);

      it('shows badges without button', async () => {
        const props = { namespaces: [...namespaces, '?', '?'] };
        const wrapper = await createSpaceList({ spaces, props });

        expect(getListText(wrapper)).toEqual(['A', 'B', 'C', 'D', 'E', '+2']);
        expect(getButton(wrapper)).toHaveLength(0);
      });
    });

    describe('with the active space and six inactive spaces', () => {
      const { spaces, namespaces } = getSpaceData(6);

      it('shows badges with button', async () => {
        const props = { namespaces };
        const wrapper = await createSpaceList({ spaces, props });

        expect(getListText(wrapper)).toEqual(['A', 'B', 'C', 'D', 'E']);

        const button = getButton(wrapper);
        expect(button.text()).toEqual('+1 more');

        await act(async () => {
          button.simulate('click');
        });
        wrapper.update();
        const badgeText = getListText(wrapper);
        expect(badgeText).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
        expect(button.text()).toEqual('show less');
      });
    });

    describe('with the active space, six inactive spaces, and one unauthorized space', () => {
      const { spaces, namespaces } = getSpaceData(6);

      it('shows badges with button', async () => {
        const props = { namespaces: [...namespaces, '?'] };
        const wrapper = await createSpaceList({ spaces, props });

        expect(getListText(wrapper)).toEqual(['A', 'B', 'C', 'D', 'E']);
        const button = getButton(wrapper);
        expect(button.text()).toEqual('+2 more');

        await act(async () => {
          button.simulate('click');
        });
        wrapper.update();
        const badgeText = getListText(wrapper);
        expect(badgeText).toEqual(['A', 'B', 'C', 'D', 'E', 'F', '+1']);
        expect(button.text()).toEqual('show less');
      });
    });

    describe('with the active space, six inactive spaces, and two unauthorized spaces', () => {
      const { spaces, namespaces } = getSpaceData(6);

      it('shows badges with button', async () => {
        const props = { namespaces: [...namespaces, '?', '?'] };
        const wrapper = await createSpaceList({ spaces, props });

        expect(getListText(wrapper)).toEqual(['A', 'B', 'C', 'D', 'E']);
        const button = getButton(wrapper);
        expect(button.text()).toEqual('+3 more');

        await act(async () => {
          button.simulate('click');
        });
        wrapper.update();
        const badgeText = getListText(wrapper);
        expect(badgeText).toEqual(['A', 'B', 'C', 'D', 'E', 'F', '+2']);
        expect(button.text()).toEqual('show less');
      });
    });

    describe('with only "all spaces"', () => {
      it('shows one badge without button', async () => {
        const props = { namespaces: ['*'] };
        const wrapper = await createSpaceList({ spaces: [], props });

        expect(getListText(wrapper)).toEqual(['*']);
        expect(getButton(wrapper)).toHaveLength(0);
      });
    });

    describe('with "all spaces", the active space, six inactive spaces, and one unauthorized space', () => {
      // same as assertions 'with only "all spaces"' test case; if "all spaces" is present, it supersedes everything else
      const { spaces, namespaces } = getSpaceData(6);

      it('shows one badge without button', async () => {
        const props = { namespaces: ['*', ...namespaces, '?'] };
        const wrapper = await createSpaceList({ spaces, props });

        expect(getListText(wrapper)).toEqual(['*']);
        expect(getButton(wrapper)).toHaveLength(0);
      });
    });
  });

  describe('using custom properties', () => {
    describe('with the active space, eight inactive spaces, and one unauthorized space', () => {
      const { spaces, namespaces } = getSpaceData(8);

      it('with displayLimit=0, shows badges without button', async () => {
        const props = { namespaces: [...namespaces, '?'], displayLimit: 0, listOnClick: jest.fn() };
        const wrapper = await createSpaceList({ spaces, props });

        expect(getListText(wrapper)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', '+1']);
        expect(getButton(wrapper)).toHaveLength(0);

        (await getListClickTarget(wrapper)).simulate('click');
        expect(props.listOnClick).toHaveBeenCalledTimes(1);
      });

      it('with displayLimit=1, shows badges with button', async () => {
        const props = { namespaces: [...namespaces, '?'], displayLimit: 1, listOnClick: jest.fn() };
        const wrapper = await createSpaceList({ spaces, props });

        expect(getListText(wrapper)).toEqual(['A']);
        const button = getButton(wrapper);
        expect(button.text()).toEqual('+8 more');

        await act(async () => {
          button.simulate('click');
        });
        wrapper.update();
        const badgeText = getListText(wrapper);
        expect(badgeText).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', '+1']);
        expect(button.text()).toEqual('show less');

        (await getListClickTarget(wrapper)).simulate('click');
        expect(props.listOnClick).toHaveBeenCalledTimes(1);
      });

      it('with displayLimit=7, shows badges with button', async () => {
        const props = { namespaces: [...namespaces, '?'], displayLimit: 7 };
        const wrapper = await createSpaceList({ spaces, props });

        expect(getListText(wrapper)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
        const button = getButton(wrapper);
        expect(button.text()).toEqual('+2 more');

        await act(async () => {
          button.simulate('click');
        });
        wrapper.update();
        const badgeText = getListText(wrapper);
        expect(badgeText).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', '+1']);
        expect(button.text()).toEqual('show less');
      });

      it('with displayLimit=8, shows badges without button', async () => {
        const props = { namespaces: [...namespaces, '?'], displayLimit: 8 };
        const wrapper = await createSpaceList({ spaces, props });

        expect(getListText(wrapper)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', '+1']);
        expect(getButton(wrapper)).toHaveLength(0);
      });

      it('with behaviorContext="outside-space", shows badges with button', async () => {
        const props: SpaceListProps = {
          namespaces: [...namespaces, '?'],
          behaviorContext: 'outside-space',
        };
        const wrapper = await createSpaceList({ spaces, props });

        expect(getListText(wrapper)).toEqual(['D!', 'A', 'B', 'C', 'D']);
        const button = getButton(wrapper);
        expect(button.text()).toEqual('+5 more');

        await act(async () => {
          button.simulate('click');
        });
        wrapper.update();
        const badgeText = getListText(wrapper);
        expect(badgeText).toEqual(['D!', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', '+1']);
        expect(button.text()).toEqual('show less');
      });
    });
  });

  describe('with a SpacesContext for a specific feature', () => {
    describe('with the active space, eight inactive spaces, and one unauthorized space', () => {
      const { spaces, namespaces } = getSpaceData(8);

      it('shows badges with button, showing disabled features at the end of the list', async () => {
        // Each space that is generated by the getSpaceData function has a disabled feature derived from its own ID.
        // E.g., the Alpha space has `disabledFeatures: ['alpha-feature']`, the Bravo space has `disabledFeatures: ['bravo-feature']`, and
        // so on and so forth. For this test case we will render the Space context for the 'bravo-feature' feature, so the SpaceAvatar for
        // the Bravo space will appear at the end of the list.
        const props = { namespaces: [...namespaces, '?'] };
        const feature = 'bravo-feature';
        const wrapper = await createSpaceList({ spaces, props, feature });

        expect(getListText(wrapper)).toEqual(['A', 'C', 'D', 'E', 'F']);
        const button = getButton(wrapper);
        expect(button.text()).toEqual('+4 more');

        await act(async () => {
          button.simulate('click');
        });
        wrapper.update();
        const badgeText = getListText(wrapper);
        expect(badgeText).toEqual(['A', 'C', 'D', 'E', 'F', 'G', 'H', 'B', '+1']);
        expect(button.text()).toEqual('show less');
      });
    });
  });
});
