/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { PageHeader } from '../page_header';
import { renderWithRouter, MountWithReduxProvider } from '../../lib';

describe('PageHeader', () => {
  it('shallow renders with the date picker', () => {
    const component = renderWithRouter(
      <MountWithReduxProvider>
        <PageHeader headingText={'TestingHeading'} datePicker={true} />
      </MountWithReduxProvider>
    );
    expect(component).toMatchSnapshot('page_header_with_date_picker');
  });

  it('shallow renders without the date picker', () => {
    const component = renderWithRouter(
      <MountWithReduxProvider>
        <PageHeader headingText={'TestingHeading'} datePicker={false} />
      </MountWithReduxProvider>
    );
    expect(component).toMatchSnapshot('page_header_no_date_picker');
  });

  it('shallow renders extra links', () => {
    const component = renderWithRouter(
      <MountWithReduxProvider>
        <PageHeader headingText={'TestingHeading'} extraLinks={true} datePicker={true} />
      </MountWithReduxProvider>
    );
    expect(component).toMatchSnapshot('page_header_with_extra_links');
  });
});
