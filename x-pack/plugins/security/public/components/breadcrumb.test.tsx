/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render } from '@testing-library/react';
import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';

import { Breadcrumb, BreadcrumbsProvider, createBreadcrumbsChangeHandler } from './breadcrumb';

describe('security breadcrumbs', () => {
  const setBreadcrumbs = jest.fn();
  const { chrome } = coreMock.createStart();

  beforeEach(() => {
    setBreadcrumbs.mockReset();
    chrome.docTitle.reset.mockReset();
    chrome.docTitle.change.mockReset();
  });

  it('rendering one breadcrumb and it should NOT have an href attributes', async () => {
    render(
      <BreadcrumbsProvider onChange={createBreadcrumbsChangeHandler(chrome, setBreadcrumbs)}>
        <Breadcrumb text={'Find'} href="/">
          <div>{'Find'}</div>
        </Breadcrumb>
      </BreadcrumbsProvider>
    );

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([{ text: 'Find' }]);
  });

  it('rendering two breadcrumb and our last breadcrumb should NOT have an href attributes', async () => {
    render(
      <BreadcrumbsProvider onChange={createBreadcrumbsChangeHandler(chrome, setBreadcrumbs)}>
        <Breadcrumb text={'Find'} href="/">
          <div>{'Find'}</div>
          <Breadcrumb text={'Sandy'} href="/sandy">
            <div>{'Sandy is a sweet dog'}</div>
          </Breadcrumb>
        </Breadcrumb>
      </BreadcrumbsProvider>
    );

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([{ href: '/', text: 'Find' }, { text: 'Sandy' }]);
  });

  it('rendering three breadcrumb and our last breadcrumb should NOT have an href attributes', async () => {
    render(
      <BreadcrumbsProvider onChange={createBreadcrumbsChangeHandler(chrome, setBreadcrumbs)}>
        <Breadcrumb text={'Find'} href="/">
          <div>{'Find'}</div>
          <Breadcrumb text={'Sandy'} href="/sandy">
            <div>{'Sandy is a sweet dog'}</div>
            <Breadcrumb text={'Breed'} href="/sandy/breed">
              <div>{'Sandy is a mutts'}</div>
            </Breadcrumb>
          </Breadcrumb>
        </Breadcrumb>
      </BreadcrumbsProvider>
    );

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: '/', text: 'Find' },
      { href: '/sandy', text: 'Sandy' },
      { text: 'Breed' },
    ]);
  });
});
