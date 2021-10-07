/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TrustedAppGenerator } from '../../../../common/endpoint/data_generators/trusted_app_generator';
import { cloneDeep } from 'lodash';
import { getExceptionListItemSchemaMock } from '../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../common/mock/endpoint';
import React from 'react';
import { ArtifactCardGrid, ArtifactCardGridProps } from './artifact_card_grid';

// FIXME:PT refactor helpers below after merge of PR https://github.com/elastic/kibana/pull/113363

const getCommonItemDataOverrides = () => {
  return {
    name: 'some internal app',
    description: 'this app is trusted by the company',
    created_at: new Date('2021-07-01').toISOString(),
  };
};

const getTrustedAppProvider = () =>
  new TrustedAppGenerator('seed').generate(getCommonItemDataOverrides());

const getExceptionProvider = () => {
  // cloneDeep needed because exception mock generator uses state across instances
  return cloneDeep(
    getExceptionListItemSchemaMock({
      ...getCommonItemDataOverrides(),
      os_types: ['windows'],
      updated_at: new Date().toISOString(),
      created_by: 'Justa',
      updated_by: 'Mara',
      entries: [
        {
          field: 'process.hash.*',
          operator: 'included',
          type: 'match',
          value: '1234234659af249ddf3e40864e9fb241',
        },
        {
          field: 'process.executable.caseless',
          operator: 'included',
          type: 'match',
          value: '/one/two/three',
        },
      ],
      tags: ['policy:all'],
    })
  );
};

describe.each([
  ['trusted apps', getTrustedAppProvider],
  ['exceptions/event filters', getExceptionProvider],
])('when using the ArtifactCardGrid component %s', (_, generateItem) => {
  let appTestContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let render: (
    props?: Partial<ArtifactCardGridProps>
  ) => ReturnType<AppContextTestRender['render']>;
  let items: ArtifactCardGridProps['items'];
  let pageChangeHandler: jest.Mock<ArtifactCardGridProps['onPageChange']>;
  let expandCollapseHandler: jest.Mock<ArtifactCardGridProps['onExpandCollapse']>;
  let cardComponentPropsProvider: Required<ArtifactCardGridProps>['cardComponentProps'];

  beforeEach(() => {
    items = Array.from({ length: 5 }, () => generateItem());
    pageChangeHandler = jest.fn();
    expandCollapseHandler = jest.fn();
    cardComponentPropsProvider = jest.fn().mockReturnValue({});

    appTestContext = createAppRootMockRenderer();
    render = (props = {}) => {
      renderResult = appTestContext.render(
        <ArtifactCardGrid
          {...{
            items,
            onPageChange: pageChangeHandler,
            onExpandCollapse: expandCollapseHandler,
            cardComponentProps: cardComponentPropsProvider,
            'data-test-subj': 'testGrid',
            ...props,
          }}
        />
      );
      return renderResult;
    };
  });

  it('should render the cards', () => {
    render();

    expect(renderResult.getAllByTestId('testGrid-card')).toHaveLength(5);
  });

  it.each([
    ['header', 'testGrid-header'],
    ['expand/collapse placeholder', 'testGrid-header-expandCollapsePlaceHolder'],
    ['name column', 'testGrid-header-layout-title'],
    ['description column', 'testGrid-header-layout-description'],
    ['description column', 'testGrid-header-layout-cardActionsPlaceholder'],
  ])('should display the Grid Header - %s', (__, selector) => {
    render();

    expect(renderResult.getByTestId(selector)).not.toBeNull();
  });

  it.todo('should call onPageChange callback when paginating');

  it.todo('should use the props provided by cardComponentProps callback');

  describe('and when cards are expanded/collapsed', () => {
    it.todo('should call onExpandCollapse callback');

    it.todo('should provide list of cards that are expanded and collapsed');

    it.todo('should show card expanded if card props defined it as such');
  });
});
