/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';

import { TestProviders } from '../../../../mock';
import { ExceptionItemCardMetaInfo } from './exception_item_card_meta';

describe('ExceptionItemCardMetaInfo', () => {
  it('it renders item creation info', () => {
    const wrapper = mount(
      <TestProviders>
        <ExceptionItemCardMetaInfo
          item={getExceptionListItemSchemaMock()}
          dataTestSubj="exceptionItemMeta"
        />
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="exceptionItemMeta-createdBy-value1"]').at(0).text()
    ).toEqual('Apr 20, 2020 @ 15:25:31.830');
    expect(
      wrapper.find('[data-test-subj="exceptionItemMeta-createdBy-value2"]').at(0).text()
    ).toEqual('some user');
  });

  it('it renders item update info', () => {
    const wrapper = mount(
      <TestProviders>
        <ExceptionItemCardMetaInfo
          item={getExceptionListItemSchemaMock()}
          dataTestSubj="exceptionItemMeta"
        />
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="exceptionItemMeta-updatedBy-value1"]').at(0).text()
    ).toEqual('Apr 20, 2020 @ 15:25:31.830');
    expect(
      wrapper.find('[data-test-subj="exceptionItemMeta-updatedBy-value2"]').at(0).text()
    ).toEqual('some user');
  });
});
