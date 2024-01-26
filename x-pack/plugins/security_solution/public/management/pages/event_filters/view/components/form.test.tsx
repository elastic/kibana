/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { act, cleanup, fireEvent } from '@testing-library/react';
import { stubIndexPattern } from '@kbn/data-plugin/common/stubs';
import { useFetchIndex } from '../../../../../common/containers/source';
import { NAME_ERROR } from '../event_filters_list';
import { useCurrentUser, useKibana } from '../../../../../common/lib/kibana';
import { licenseService } from '../../../../../common/hooks/use_license';
import type { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';
import userEvent from '@testing-library/user-event';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

import { ENDPOINT_EVENT_FILTERS_LIST_ID } from '@kbn/securitysolution-list-constants';
import type {
  ArtifactFormComponentOnChangeCallbackProps,
  ArtifactFormComponentProps,
} from '../../../../components/artifact_list_page';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { EventFiltersForm } from './form';
import { EndpointDocGenerator } from '../../../../../../common/endpoint/generate_data';
import type { PolicyData } from '../../../../../../common/endpoint/types';
import { MAX_COMMENT_LENGTH } from '../../../../../../common/constants';

jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../common/containers/source');
jest.mock('../../../../../common/hooks/use_license', () => {
  const licenseServiceInstance = {
    isPlatinumPlus: jest.fn(),
    isGoldPlus: jest.fn(),
  };
  return {
    licenseService: licenseServiceInstance,
    useLicense: () => {
      return licenseServiceInstance;
    },
  };
});

describe('Event filter form', () => {
  const formPrefix = 'eventFilters-form';
  const generator = new EndpointDocGenerator('effected-policy-select');

  let formProps: jest.Mocked<ArtifactFormComponentProps>;
  let mockedContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let latestUpdatedItem: ArtifactFormComponentProps['item'];

  const getUI = () => <EventFiltersForm {...formProps} />;
  const render = () => {
    return (renderResult = mockedContext.render(getUI()));
  };
  const rerender = () => renderResult.rerender(getUI());
  const rerenderWithLatestProps = () => {
    formProps.item = latestUpdatedItem;
    rerender();
  };

  function createEntry(
    overrides?: ExceptionListItemSchema['entries'][number]
  ): ExceptionListItemSchema['entries'][number] {
    const defaultEntry: ExceptionListItemSchema['entries'][number] = {
      field: '',
      operator: 'included',
      type: 'match',
      value: '',
    };

    return {
      ...defaultEntry,
      ...overrides,
    };
  }

  function createItem(
    overrides: Partial<ArtifactFormComponentProps['item']> = {}
  ): ArtifactFormComponentProps['item'] {
    const defaults: ArtifactFormComponentProps['item'] = {
      id: 'some_item_id',
      list_id: ENDPOINT_EVENT_FILTERS_LIST_ID,
      name: '',
      description: '',
      os_types: [OperatingSystem.WINDOWS],
      entries: [createEntry()],
      type: 'simple',
      tags: ['policy:all'],
    };
    return {
      ...defaults,
      ...overrides,
    };
  }

  function createOnChangeArgs(
    overrides: Partial<ArtifactFormComponentOnChangeCallbackProps>
  ): ArtifactFormComponentOnChangeCallbackProps {
    const defaults = {
      item: createItem(),
      isValid: false,
    };
    return {
      ...defaults,
      ...overrides,
    };
  }

  function createPolicies(): PolicyData[] {
    const policies = [
      generator.generatePolicyPackagePolicy(),
      generator.generatePolicyPackagePolicy(),
    ];
    policies.map((p, i) => {
      p.id = `id-${i}`;
      p.name = `some-policy-${Math.random().toString(36).split('.').pop()}`;
      return p;
    });
    return policies;
  }

  beforeEach(async () => {
    (useCurrentUser as jest.Mock).mockReturnValue({ username: 'test-username' });
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        http: {},
        data: {},
        unifiedSearch: {},
        notifications: {},
      },
    });
    (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(true);
    mockedContext = createAppRootMockRenderer();
    latestUpdatedItem = createItem();
    (useFetchIndex as jest.Mock).mockImplementation(() => [
      false,
      {
        indexPatterns: stubIndexPattern,
      },
    ]);

    formProps = {
      item: latestUpdatedItem,
      mode: 'create',
      disabled: false,
      error: undefined,
      policiesIsLoading: false,
      onChange: jest.fn((updates) => {
        latestUpdatedItem = updates.item;
      }),
      policies: [],
    };
  });

  afterEach(() => {
    cleanup();
  });

  describe('Details and Conditions', () => {
    it('should render correctly without data', () => {
      formProps.policies = createPolicies();
      formProps.policiesIsLoading = true;
      formProps.item.tags = [formProps.policies.map((p) => `policy:${p.id}`)[0]];
      formProps.item.entries = [];
      render();
      expect(renderResult.getByTestId('loading-spinner')).not.toBeNull();
    });

    it('should render correctly with data', async () => {
      formProps.policies = createPolicies();
      render();
      expect(renderResult.queryByTestId('loading-spinner')).toBeNull();
      expect(renderResult.getByTestId('exceptionsBuilderWrapper')).not.toBeNull();
    });

    it('should display sections', async () => {
      render();
      expect(renderResult.queryByText('Details')).not.toBeNull();
      expect(renderResult.queryByText('Conditions')).not.toBeNull();
      expect(renderResult.queryByText('Comments')).not.toBeNull();
    });

    it('should display name error only when on blur and empty name', async () => {
      render();
      expect(renderResult.queryByText(NAME_ERROR)).toBeNull();
      const nameInput = renderResult.getByTestId(`${formPrefix}-name-input`);
      fireEvent.blur(nameInput);
      rerenderWithLatestProps();
      expect(renderResult.queryByText(NAME_ERROR)).not.toBeNull();
    });

    it('should change name', async () => {
      render();
      const nameInput = renderResult.getByTestId(`${formPrefix}-name-input`);

      act(() => {
        fireEvent.change(nameInput, {
          target: {
            value: 'Exception name',
          },
        });
        fireEvent.blur(nameInput);
      });
      rerenderWithLatestProps();

      expect(formProps.item?.name).toBe('Exception name');
      expect(renderResult.queryByText(NAME_ERROR)).toBeNull();
    });

    it('should change name with a white space still shows an error', async () => {
      render();
      const nameInput = renderResult.getByTestId(`${formPrefix}-name-input`);

      act(() => {
        fireEvent.change(nameInput, {
          target: {
            value: '   ',
          },
        });
        fireEvent.blur(nameInput);
      });
      rerenderWithLatestProps();

      expect(formProps.item.name).toBe('');
      expect(renderResult.queryByText(NAME_ERROR)).not.toBeNull();
    });

    it('should change description', async () => {
      render();
      const nameInput = renderResult.getByTestId(`${formPrefix}-description-input`);

      act(() => {
        fireEvent.change(nameInput, {
          target: {
            value: 'Exception description',
          },
        });
        fireEvent.blur(nameInput);
      });
      rerenderWithLatestProps();

      expect(formProps.item.description).toBe('Exception description');
    });

    it('should change comments', async () => {
      render();
      const commentInput = renderResult.getByLabelText('Comment Input');

      act(() => {
        fireEvent.change(commentInput, {
          target: {
            value: 'Exception comment',
          },
        });
        fireEvent.blur(commentInput);
      });
      rerenderWithLatestProps();

      expect(formProps.item.comments).toEqual([{ comment: 'Exception comment' }]);
    });
  });

  describe('Policy section', () => {
    beforeEach(() => {
      formProps.policies = createPolicies();
    });

    afterEach(() => {
      cleanup();
    });

    it('should display loader when policies are still loading', () => {
      formProps.policiesIsLoading = true;
      formProps.item.tags = [formProps.policies.map((p) => `policy:${p.id}`)[0]];
      render();
      expect(renderResult.getByTestId('loading-spinner')).not.toBeNull();
    });

    it('should display the policy list when "per policy" is selected', async () => {
      render();
      userEvent.click(renderResult.getByTestId('eventFilters-form-effectedPolicies-perPolicy'));
      rerenderWithLatestProps();
      // policy selector should show up
      expect(
        renderResult.getByTestId(`${formPrefix}-effectedPolicies-policiesSelectable`)
      ).toBeTruthy();
    });

    it('should call onChange when a policy is selected from the policy selection', async () => {
      formProps.item.tags = [formProps.policies.map((p) => `policy:${p.id}`)[0]];
      render();
      const policyId = formProps.policies[0].id;
      userEvent.click(renderResult.getByTestId(`${formPrefix}-effectedPolicies-perPolicy`));
      userEvent.click(renderResult.getByTestId(`policy-${policyId}`));
      formProps.item.tags = formProps.onChange.mock.calls[0][0].item.tags;
      rerender();
      const expected = createOnChangeArgs({
        item: {
          ...formProps.item,
          tags: [`policy:${policyId}`],
        },
      });
      expect(formProps.onChange).toHaveBeenCalledWith(expected);
    });

    it('should have global policy by default', async () => {
      render();
      expect(renderResult.getByTestId('eventFilters-form-effectedPolicies-global')).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      expect(
        renderResult.getByTestId('eventFilters-form-effectedPolicies-perPolicy')
      ).toHaveAttribute('aria-pressed', 'false');
    });

    it('should retain the previous policy selection when switching from per-policy to global', async () => {
      formProps.item.tags = [formProps.policies.map((p) => `policy:${p.id}`)[0]];
      render();
      const policyId = formProps.policies[0].id;
      // move to per-policy and select the first
      userEvent.click(renderResult.getByTestId('eventFilters-form-effectedPolicies-perPolicy'));
      userEvent.click(renderResult.getByTestId(`policy-${policyId}`));
      formProps.item.tags = formProps.onChange.mock.calls[0][0].item.tags;
      rerender();
      expect(
        renderResult.queryByTestId(`${formPrefix}-effectedPolicies-policiesSelectable`)
      ).toBeTruthy();
      expect(formProps.item.tags).toEqual([`policy:${policyId}`]);

      // move back to global
      userEvent.click(renderResult.getByTestId('eventFilters-form-effectedPolicies-global'));
      formProps.item.tags = ['policy:all'];
      rerenderWithLatestProps();
      expect(formProps.item.tags).toEqual(['policy:all']);
      expect(
        renderResult.queryByTestId(`${formPrefix}-effectedPolicies-policiesSelectable`)
      ).toBeFalsy();

      // move back to per-policy
      userEvent.click(renderResult.getByTestId('eventFilters-form-effectedPolicies-perPolicy'));
      formProps.item.tags = [`policy:${policyId}`];
      rerender();
      // on change called with the previous policy
      expect(formProps.item.tags).toEqual([`policy:${policyId}`]);
      // the previous selected policy should be selected
      // expect(renderResult.getByTestId(`policy-${policyId}`)).toHaveAttribute(
      //   'data-test-selected',
      //   'true'
      // );
    });
  });

  describe('Policy section with downgraded license', () => {
    beforeEach(() => {
      const policies = createPolicies();
      formProps.policies = policies;
      formProps.item.tags = [policies.map((p) => `policy:${p.id}`)[0]];
      formProps.mode = 'edit';
      // downgrade license
      (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(false);
    });

    it('should hide assignment section when no license', () => {
      render();
      formProps.item.tags = ['policy:all'];
      rerender();
      expect(renderResult.queryByTestId(`${formPrefix}-effectedPolicies`)).toBeNull();
    });

    it('should hide assignment section when create mode and no license even with by policy', () => {
      render();
      formProps.mode = 'create';
      rerender();
      expect(renderResult.queryByTestId(`${formPrefix}-effectedPolicies`)).toBeNull();
    });

    it('should show disabled assignment section when edit mode and no license with by policy', async () => {
      render();
      formProps.item.tags = ['policy:id-0'];
      rerender();

      expect(
        renderResult.queryByTestId('eventFilters-form-effectedPolicies-perPolicy')
      ).not.toBeNull();
      expect(renderResult.getByTestId('policy-id-0').getAttribute('aria-disabled')).toBe('true');
    });

    it("allows the user to set the event filter entry to 'Global' in the edit option", () => {
      render();
      const globalButtonInput = renderResult.getByTestId(
        'eventFilters-form-effectedPolicies-global'
      ) as HTMLButtonElement;
      userEvent.click(globalButtonInput);
      formProps.item.tags = ['policy:all'];
      rerender();
      const expected = createOnChangeArgs({
        item: {
          ...formProps.item,
          tags: ['policy:all'],
        },
      });
      expect(formProps.onChange).toHaveBeenCalledWith(expected);

      const policyItem = formProps.onChange.mock.calls[0][0].item.tags
        ? formProps.onChange.mock.calls[0][0].item.tags[0]
        : '';

      expect(policyItem).toBe('policy:all');
    });
  });

  describe('Warnings', () => {
    beforeEach(() => {
      render();
    });

    it('should not show warning text when unique fields are added', async () => {
      formProps.item.entries = [
        {
          field: 'event.category',
          operator: 'included',
          type: 'match',
          value: 'some value',
        },
        {
          field: 'file.name',
          operator: 'excluded',
          type: 'match',
          value: 'some other value',
        },
      ];
      rerender();
      expect(renderResult.queryByTestId('duplicate-fields-warning-message')).toBeNull();
    });

    it('should not show warning text when field values are not added', async () => {
      formProps.item.entries = [
        {
          field: 'event.category',
          operator: 'included',
          type: 'match',
          value: '',
        },
        {
          field: 'event.category',
          operator: 'excluded',
          type: 'match',
          value: '',
        },
      ];
      rerender();
      expect(renderResult.queryByTestId('duplicate-fields-warning-message')).toBeNull();
    });

    it('should show warning text when duplicate fields are added with values', async () => {
      formProps.item.entries = [
        {
          field: 'event.category',
          operator: 'included',
          type: 'match',
          value: 'some value',
        },
        {
          field: 'event.category',
          operator: 'excluded',
          type: 'match',
          value: 'some other value',
        },
      ];
      rerender();
      expect(renderResult.findByTestId('duplicate-fields-warning-message')).not.toBeNull();
    });
  });

  describe('Errors', () => {
    beforeEach(() => {
      render();
    });

    it('should not show warning text when unique fields are added', async () => {
      rerender();

      const commentInput = renderResult.getByLabelText('Comment Input');

      expect(
        renderResult.queryByText(
          `The length of the comment is too long. The maximum length is ${MAX_COMMENT_LENGTH} characters.`
        )
      ).toBeNull();
      act(() => {
        fireEvent.change(commentInput, {
          target: {
            value: [...new Array(MAX_COMMENT_LENGTH + 1).keys()].map((_) => 'a').join(''),
          },
        });
        fireEvent.blur(commentInput);
      });
      expect(
        renderResult.queryByText(
          `The length of the comment is too long. The maximum length is ${MAX_COMMENT_LENGTH} characters.`
        )
      ).not.toBeNull();
    });
  });
});
