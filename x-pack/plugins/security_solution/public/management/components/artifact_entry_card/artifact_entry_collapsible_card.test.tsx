/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { act, fireEvent } from '@testing-library/react';
import { AnyArtifact } from './types';
import { getTrustedAppProviderMock, getExceptionProviderMock } from './test_utils';
import {
  ArtifactEntryCollapsibleCard,
  ArtifactEntryCollapsibleCardProps,
} from './artifact_entry_collapsible_card';

describe.each([
  ['trusted apps', getTrustedAppProviderMock],
  ['exceptions/event filters', getExceptionProviderMock],
])('when using the ArtifactEntryCard component with %s', (_, generateItem) => {
  let item: AnyArtifact;
  let appTestContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let render: (
    props?: Partial<ArtifactEntryCollapsibleCardProps>
  ) => ReturnType<AppContextTestRender['render']>;
  let handleOnExpandCollapse: jest.MockedFunction<
    ArtifactEntryCollapsibleCardProps['onExpandCollapse']
  >;

  beforeEach(() => {
    item = generateItem();
    appTestContext = createAppRootMockRenderer();
    handleOnExpandCollapse = jest.fn();
    render = (props = {}) => {
      const cardProps: ArtifactEntryCollapsibleCardProps = {
        item,
        onExpandCollapse: handleOnExpandCollapse,
        'data-test-subj': 'testCard',
        ...props,
      };

      renderResult = appTestContext.render(<ArtifactEntryCollapsibleCard {...cardProps} />);
      return renderResult;
    };
  });

  it.each([
    ['expandCollapse button', 'testCard-header-expandCollapse'],
    ['name', 'testCard-header-titleHolder'],
    ['description', 'testCard-header-descriptionHolder'],
    ['assignment', 'testCard-header-effectScope'],
  ])('should show %s', (__, testSubjId) => {
    render();

    expect(renderResult.getByTestId(testSubjId)).not.toBeNull();
  });

  it('should NOT show actions menu if none are defined', async () => {
    render();

    expect(renderResult.queryByTestId('testCard-header-actions')).toBeNull();
  });

  it('should render card collapsed', () => {
    render();

    expect(renderResult.queryByTestId('testCard-header-criteriaConditions')).toBeNull();
  });

  it('should render card expanded', () => {
    render({ expanded: true });

    expect(renderResult.getByTestId('testCard-criteriaConditions')).not.toBeNull();
  });

  it('should display tooltip if collapsed', () => {
    render();

    expect(renderResult.baseElement.querySelectorAll('.euiToolTipAnchor')).toHaveLength(2);
  });

  it('should display tooltip when collapsed but only if not empty', () => {
    item.description = '';
    render();

    expect(renderResult.baseElement.querySelectorAll('.euiToolTipAnchor')).toHaveLength(1);
  });

  it('should NOT display a tooltip if expanded', () => {
    render({ expanded: true });

    expect(renderResult.baseElement.querySelectorAll('.euiToolTipAnchor')).toHaveLength(0);
  });

  it('should call `onExpandCollapse` callback when button is clicked', () => {
    render();
    act(() => {
      fireEvent.click(renderResult.getByTestId('testCard-header-expandCollapse'));
    });

    expect(handleOnExpandCollapse).toHaveBeenCalled();
  });

  it.each([
    ['title', 'testCard-header-titleHolder'],
    ['description', 'testCard-header-descriptionHolder'],
  ])('should truncate %s text when collapsed', (__, testSubjId) => {
    render();

    expect(renderResult.getByTestId(testSubjId).classList.contains('eui-textTruncate')).toBe(true);
  });

  it.each([
    ['title', 'testCard-header-titleHolder'],
    ['description', 'testCard-header-descriptionHolder'],
  ])('should NOT truncate %s text when expanded', (__, testSubjId) => {
    render({ expanded: true });

    expect(renderResult.getByTestId(testSubjId).classList.contains('eui-textTruncate')).toBe(false);
  });
});
