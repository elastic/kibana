/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  fireEvent,
  render,
  RenderResult,
  screen,
} from '@testing-library/react';
import React, { ReactNode } from 'react';
import { act } from 'react-dom/test-utils';
import { getCallApmApiSpy } from '../../../../../services/rest/callApmApiSpy';
import { CustomLinkOverview } from '.';
import { License } from '../../../../../../../licensing/common/license';
import { LicenseContext } from '../../../../../context/license/license_context';
import * as hooks from '../../../../../hooks/use_fetcher';
import {
  expectTextsInDocument,
  expectTextsNotInDocument,
} from '../../../../../utils/testHelpers';
import * as saveCustomLink from './create_edit_custom_link_flyout/saveCustomLink';
import { MockContextProvider } from '../../../../../context/mock/mock_context';

const data = {
  customLinks: [
    { id: '1', label: 'label 1', url: 'url 1', 'service.name': 'opbeans-java' },
    { id: '2', label: 'label 2', url: 'url 2', 'transaction.type': 'request' },
  ],
};

function getWrapper({
  canSave,
  license,
}: {
  canSave: boolean;
  license: License;
}) {
  return ({ children }: { children?: ReactNode }) => {
    return (
      <MockContextProvider
        value={{
          coreStart: {
            application: { capabilities: { apm: { save: canSave }, ml: {} } },
          },
        }}
      >
        <LicenseContext.Provider value={license}>
          {children}
        </LicenseContext.Provider>
      </MockContextProvider>
    );
  };
}

describe('CustomLink', () => {
  beforeAll(() => {
    getCallApmApiSpy().mockResolvedValue({});
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
        data: { customLinks: [] },
        status: hooks.FETCH_STATUS.SUCCESS,
        refetch: jest.fn(),
      });
    });

    afterAll(() => {
      jest.clearAllMocks();
    });
    it('shows when no link is available', () => {
      const component = render(<CustomLinkOverview />, {
        wrapper: getWrapper({ canSave: true, license: goldLicense }),
      });
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

    it('enables create button when user has write privileges', () => {
      render(<CustomLinkOverview />, {
        wrapper: getWrapper({ canSave: true, license: goldLicense }),
      });

      const createButton = screen.getByTestId(
        'createButton'
      ) as HTMLButtonElement;

      expect(createButton.disabled).toBeFalsy();
    });

    it('enables edit button on custom link table when user has writte privileges', () => {
      const { getAllByText } = render(<CustomLinkOverview />, {
        wrapper: getWrapper({ canSave: true, license: goldLicense }),
      });

      expect(getAllByText('Edit').length).toEqual(2);
    });

    it('shows a table with all custom link', () => {
      const component = render(<CustomLinkOverview />, {
        wrapper: getWrapper({ canSave: true, license: goldLicense }),
      });
      expectTextsInDocument(component, [
        'label 1',
        'url 1',
        'label 2',
        'url 2',
      ]);
    });

    it('checks if create custom link button is available and working', () => {
      const { queryByText, getByText } = render(<CustomLinkOverview />, {
        wrapper: getWrapper({ canSave: true, license: goldLicense }),
      });
      expect(queryByText('Create link')).not.toBeInTheDocument();
      act(() => {
        fireEvent.click(getByText('Create custom link'));
      });
      expect(queryByText('Create link')).toBeInTheDocument();
    });
  });

  describe('flyout', () => {
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

    const openFlyout = () => {
      const component = render(<CustomLinkOverview />, {
        wrapper: getWrapper({ canSave: true, license: goldLicense }),
      });
      expect(component.queryByText('Create link')).not.toBeInTheDocument();
      act(() => {
        fireEvent.click(component.getByText('Create custom link'));
      });
      expect(component.queryByText('Create link')).toBeInTheDocument();
      return component;
    };

    it('creates a custom link', async () => {
      const component = openFlyout();
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
        fireEvent.submit(component.getByText('Save'));
      });
      expect(saveCustomLinkSpy).toHaveBeenCalledTimes(1);
    });

    describe('filters', () => {
      const addFilterField = (component: RenderResult, amount: number) => {
        for (let i = 1; i <= amount; i++) {
          fireEvent.click(component.getByText('Add another filter'));
        }
      };
      it('checks if add filter button is disabled after all elements have been added', () => {
        const component = openFlyout();
        expect(component.getAllByText('service.name').length).toEqual(1);
        addFilterField(component, 1);
        expect(component.getAllByText('service.name').length).toEqual(2);
        addFilterField(component, 2);
        expect(component.getAllByText('service.name').length).toEqual(4);
        // After 4 items, the button is disabled
        addFilterField(component, 2);
        expect(component.getAllByText('service.name').length).toEqual(4);
      });
      it('removes items already selected', () => {
        const component = openFlyout();

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
        data: { customLinks: [] },
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
      const component = render(<CustomLinkOverview />, {
        wrapper: getWrapper({ canSave: true, license }),
      });
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
      const component = render(<CustomLinkOverview />, {
        wrapper: getWrapper({ canSave: true, license }),
      });
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
      const component = render(<CustomLinkOverview />, {
        wrapper: getWrapper({ canSave: true, license }),
      });
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
      const component = render(<CustomLinkOverview />, {
        wrapper: getWrapper({ canSave: true, license }),
      });
      expectTextsNotInDocument(component, ['Start free 30-day trial']);
    });
  });

  describe('with read-only user', () => {
    it('disables create custom link button', () => {
      const { getByTestId } = render(<CustomLinkOverview />, {
        wrapper: getWrapper({ canSave: false, license: goldLicense }),
      });

      const createButton = getByTestId('createButton') as HTMLButtonElement;
      expect(createButton.disabled).toBeTruthy();
    });

    it('removes edit button on custom link table', () => {
      const { queryAllByText } = render(<CustomLinkOverview />, {
        wrapper: getWrapper({ canSave: false, license: goldLicense }),
      });

      expect(queryAllByText('Edit').length).toEqual(0);
    });
  });
});
