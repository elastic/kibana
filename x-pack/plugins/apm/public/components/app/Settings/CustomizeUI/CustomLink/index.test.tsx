/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fireEvent, render, wait, RenderResult } from '@testing-library/react';
import React from 'react';
import { act } from 'react-dom/test-utils';
import * as apmApi from '../../../../../services/rest/createCallApmApi';
import { License } from '../../../../../../../licensing/common/license';
import * as hooks from '../../../../../hooks/useFetcher';
import { LicenseContext } from '../../../../../context/LicenseContext';
import { CustomLinkOverview } from '.';
import {
  expectTextsInDocument,
  expectTextsNotInDocument,
} from '../../../../../utils/testHelpers';
import * as saveCustomLink from './CustomLinkFlyout/saveCustomLink';
import { MockApmPluginContextWrapper } from '../../../../../context/ApmPluginContext/MockApmPluginContext';

const data = [
  {
    id: '1',
    label: 'label 1',
    url: 'url 1',
    'service.name': 'opbeans-java',
  },
  {
    id: '2',
    label: 'label 2',
    url: 'url 2',
    'transaction.type': 'request',
  },
];

describe('CustomLink', () => {
  let callApmApiSpy: jest.SpyInstance<any, never>;
  beforeAll(() => {
    callApmApiSpy = jest.spyOn(apmApi, 'callApmApi').mockReturnValue({});
  });
  afterAll(() => {
    jest.resetAllMocks();
  });
  const goldLicense = new License({
    signature: 'test signature',
    license: {
      expiryDateInMillis: 0,
      mode: 'gold',
      status: 'active',
      type: 'gold',
      uid: '1',
    },
  });
  describe('empty prompt', () => {
    beforeAll(() => {
      jest.spyOn(hooks, 'useFetcher').mockReturnValue({
        data: [],
        status: hooks.FETCH_STATUS.SUCCESS,
        refetch: jest.fn(),
      });
    });

    afterAll(() => {
      jest.clearAllMocks();
    });
    it('shows when no link is available', () => {
      const component = render(
        <LicenseContext.Provider value={goldLicense}>
          <CustomLinkOverview />
        </LicenseContext.Provider>
      );
      expectTextsInDocument(component, ['No links found.']);
    });
  });

  describe('overview', () => {
    beforeAll(() => {
      jest.spyOn(hooks, 'useFetcher').mockReturnValue({
        data,
        status: hooks.FETCH_STATUS.SUCCESS,
        refetch: jest.fn(),
      });
    });

    afterAll(() => {
      jest.clearAllMocks();
    });

    it('shows a table with all custom link', () => {
      const component = render(
        <LicenseContext.Provider value={goldLicense}>
          <MockApmPluginContextWrapper>
            <CustomLinkOverview />
          </MockApmPluginContextWrapper>
        </LicenseContext.Provider>
      );
      expectTextsInDocument(component, [
        'label 1',
        'url 1',
        'label 2',
        'url 2',
      ]);
    });

    it('checks if create custom link button is available and working', async () => {
      const { queryByText, getByText } = render(
        <LicenseContext.Provider value={goldLicense}>
          <MockApmPluginContextWrapper>
            <CustomLinkOverview />
          </MockApmPluginContextWrapper>
        </LicenseContext.Provider>
      );
      expect(queryByText('Create link')).not.toBeInTheDocument();
      act(() => {
        fireEvent.click(getByText('Create custom link'));
      });
      await wait(() => expect(callApmApiSpy).toHaveBeenCalled());
      expect(queryByText('Create link')).toBeInTheDocument();
    });
  });

  describe('Flyout', () => {
    const refetch = jest.fn();
    let saveCustomLinkSpy: jest.SpyInstance;

    beforeAll(() => {
      saveCustomLinkSpy = jest.spyOn(saveCustomLink, 'saveCustomLink');
      jest.spyOn(hooks, 'useFetcher').mockReturnValue({
        data,
        status: hooks.FETCH_STATUS.SUCCESS,
        refetch,
      });
    });

    const openFlyout = async () => {
      const component = render(
        <LicenseContext.Provider value={goldLicense}>
          <MockApmPluginContextWrapper>
            <CustomLinkOverview />
          </MockApmPluginContextWrapper>
        </LicenseContext.Provider>
      );
      expect(component.queryByText('Create link')).not.toBeInTheDocument();
      act(() => {
        fireEvent.click(component.getByText('Create custom link'));
      });
      await wait(() =>
        expect(component.queryByText('Create link')).toBeInTheDocument()
      );
      await wait(() => expect(callApmApiSpy).toHaveBeenCalled());
      return component;
    };

    it('creates a custom link', async () => {
      const component = await openFlyout();
      const labelInput = component.getByTestId('label');
      act(() => {
        fireEvent.change(labelInput, {
          target: { value: 'foo' },
        });
      });
      const urlInput = component.getByTestId('url');
      act(() => {
        fireEvent.change(urlInput, {
          target: { value: 'bar' },
        });
      });
      await act(async () => {
        await wait(() => fireEvent.submit(component.getByText('Save')));
      });
      expect(saveCustomLinkSpy).toHaveBeenCalledTimes(1);
    });

    it('deletes a custom link', async () => {
      const component = render(
        <LicenseContext.Provider value={goldLicense}>
          <MockApmPluginContextWrapper>
            <CustomLinkOverview />
          </MockApmPluginContextWrapper>
        </LicenseContext.Provider>
      );
      expect(component.queryByText('Create link')).not.toBeInTheDocument();
      const editButtons = component.getAllByLabelText('Edit');
      expect(editButtons.length).toEqual(2);
      act(() => {
        fireEvent.click(editButtons[0]);
      });
      expect(component.queryByText('Create link')).toBeInTheDocument();
      await act(async () => {
        await wait(() => fireEvent.click(component.getByText('Delete')));
      });
      expect(callApmApiSpy).toHaveBeenCalled();
      expect(refetch).toHaveBeenCalled();
    });

    describe('Filters', () => {
      const addFilterField = (component: RenderResult, amount: number) => {
        for (let i = 1; i <= amount; i++) {
          fireEvent.click(component.getByText('Add another filter'));
        }
      };
      it('checks if add filter button is disabled after all elements have been added', async () => {
        const component = await openFlyout();
        expect(component.getAllByText('service.name').length).toEqual(1);
        addFilterField(component, 1);
        expect(component.getAllByText('service.name').length).toEqual(2);
        addFilterField(component, 2);
        expect(component.getAllByText('service.name').length).toEqual(4);
        // After 4 items, the button is disabled
        addFilterField(component, 2);
        expect(component.getAllByText('service.name').length).toEqual(4);
      });
      it('removes items already selected', async () => {
        const component = await openFlyout();

        const addFieldAndCheck = (
          fieldName: string,
          selectValue: string,
          addNewFilter: boolean,
          optionsExpected: string[]
        ) => {
          if (addNewFilter) {
            addFilterField(component, 1);
          }
          const field = component.getByTestId(fieldName) as HTMLSelectElement;
          const optionsAvailable = Object.values(field)
            .map((option) => (option as HTMLOptionElement).text)
            .filter((option) => option);

          act(() => {
            fireEvent.change(field, {
              target: { value: selectValue },
            });
          });
          expect(field.value).toEqual(selectValue);
          expect(optionsAvailable).toEqual(optionsExpected);
        };

        addFieldAndCheck('filter-0', 'transaction.name', false, [
          'Select field...',
          'service.name',
          'service.environment',
          'transaction.type',
          'transaction.name',
        ]);

        addFieldAndCheck('filter-1', 'service.name', true, [
          'Select field...',
          'service.name',
          'service.environment',
          'transaction.type',
        ]);

        addFieldAndCheck('filter-2', 'transaction.type', true, [
          'Select field...',
          'service.environment',
          'transaction.type',
        ]);

        addFieldAndCheck('filter-3', 'service.environment', true, [
          'Select field...',
          'service.environment',
        ]);
      });
    });
  });

  describe('invalid license', () => {
    beforeAll(() => {
      jest.spyOn(hooks, 'useFetcher').mockReturnValue({
        data: [],
        status: hooks.FETCH_STATUS.SUCCESS,
        refetch: jest.fn(),
      });
    });
    it('shows license prompt when user has a basic license', () => {
      const license = new License({
        signature: 'test signature',
        license: {
          expiryDateInMillis: 0,
          mode: 'basic',
          status: 'active',
          type: 'basic',
          uid: '1',
        },
      });
      const component = render(
        <LicenseContext.Provider value={license}>
          <MockApmPluginContextWrapper>
            <CustomLinkOverview />
          </MockApmPluginContextWrapper>
        </LicenseContext.Provider>
      );
      expectTextsInDocument(component, ['Start free 30-day trial']);
    });
    it('shows license prompt when user has an invalid gold license', () => {
      const license = new License({
        signature: 'test signature',
        license: {
          expiryDateInMillis: 0,
          mode: 'gold',
          status: 'invalid',
          type: 'gold',
          uid: '1',
        },
      });
      const component = render(
        <LicenseContext.Provider value={license}>
          <MockApmPluginContextWrapper>
            <CustomLinkOverview />
          </MockApmPluginContextWrapper>
        </LicenseContext.Provider>
      );
      expectTextsInDocument(component, ['Start free 30-day trial']);
    });
    it('shows license prompt when user has an invalid trial license', () => {
      const license = new License({
        signature: 'test signature',
        license: {
          expiryDateInMillis: 0,
          mode: 'trial',
          status: 'invalid',
          type: 'trial',
          uid: '1',
        },
      });
      const component = render(
        <LicenseContext.Provider value={license}>
          <MockApmPluginContextWrapper>
            <CustomLinkOverview />
          </MockApmPluginContextWrapper>
        </LicenseContext.Provider>
      );
      expectTextsInDocument(component, ['Start free 30-day trial']);
    });
    it('doesnt show license prompt when user has a trial license', () => {
      const license = new License({
        signature: 'test signature',
        license: {
          expiryDateInMillis: 0,
          mode: 'trial',
          status: 'active',
          type: 'trial',
          uid: '1',
        },
      });
      const component = render(
        <LicenseContext.Provider value={license}>
          <MockApmPluginContextWrapper>
            <CustomLinkOverview />
          </MockApmPluginContextWrapper>
        </LicenseContext.Provider>
      );
      expectTextsNotInDocument(component, ['Start free 30-day trial']);
    });
  });
});
