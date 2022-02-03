/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { act } from '@testing-library/react';

import { RulesTableFilters } from './rules_table_filters';
import { useAppToastsMock } from '../../../../../../common/hooks/use_app_toasts.mock';
import { useAppToasts } from '../../../../../../common/hooks/use_app_toasts';
jest.mock('../../../../../../common/hooks/use_app_toasts');

describe('RulesTableFilters', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    jest.resetAllMocks();
    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);
  });

  it('renders no numbers next to rule type button filter if none exist', async () => {
    await act(async () => {
      const wrapper = mount(
        <RulesTableFilters
          onFilterChanged={jest.fn()}
          rulesCustomInstalled={null}
          rulesInstalled={null}
          currentFilterTags={[]}
          tags={[]}
          isLoadingTags={false}
          reFetchTags={() => ({})}
        />
      );

      expect(wrapper.find('[data-test-subj="showElasticRulesFilterButton"]').at(0).text()).toEqual(
        'Elastic rules'
      );
      expect(wrapper.find('[data-test-subj="showCustomRulesFilterButton"]').at(0).text()).toEqual(
        'Custom rules'
      );
    });
  });

  it('renders number of custom and prepackaged rules', async () => {
    await act(async () => {
      const wrapper = mount(
        <RulesTableFilters
          onFilterChanged={jest.fn()}
          rulesCustomInstalled={10}
          rulesInstalled={9}
          currentFilterTags={[]}
          tags={[]}
          isLoadingTags={false}
          reFetchTags={() => ({})}
        />
      );

      expect(wrapper.find('[data-test-subj="showElasticRulesFilterButton"]').at(0).text()).toEqual(
        'Elastic rules (9)'
      );
      expect(wrapper.find('[data-test-subj="showCustomRulesFilterButton"]').at(0).text()).toEqual(
        'Custom rules (10)'
      );
    });
  });
});
