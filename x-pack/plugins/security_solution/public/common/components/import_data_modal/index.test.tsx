/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { ImportDataModalComponent } from './index';
jest.mock('../../lib/kibana');

describe('ImportDataModal', () => {
  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <ImportDataModalComponent
        showModal={true}
        closeModal={jest.fn()}
        importComplete={jest.fn()}
        checkBoxLabel="checkBoxLabel"
        description="description"
        errorMessage="errorMessage"
        failedDetailed={jest.fn()}
        importData={jest.fn()}
        showCheckBox={true}
        submitBtnText="submitBtnText"
        subtitle="subtitle"
        successMessage={jest.fn((totalCount) => 'successMessage')}
        title="title"
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
