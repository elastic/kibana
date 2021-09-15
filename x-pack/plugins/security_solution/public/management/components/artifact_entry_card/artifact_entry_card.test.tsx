/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { cloneDeep } from 'lodash';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { ArtifactEntryCard, ArtifactEntryCardProps } from './artifact_entry_card';
import { TrustedAppGenerator } from '../../../../common/endpoint/data_generators/trusted_app_generator';
import { act, fireEvent, getByTestId } from '@testing-library/react';
import { getExceptionListItemSchemaMock } from '../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { AnyArtifact } from './types';
import { isTrustedApp } from './hooks/use_normalized_artifact';

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
])('when using the ArtifactEntryCard component with %s', (_, generateItem) => {
  let item: AnyArtifact;
  let appTestContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let render: (
    props?: Partial<ArtifactEntryCardProps>
  ) => ReturnType<AppContextTestRender['render']>;

  beforeEach(() => {
    item = generateItem();
    appTestContext = createAppRootMockRenderer();
    render = (props = {}) => {
      renderResult = appTestContext.render(
        <ArtifactEntryCard
          {...{
            item,
            'data-test-subj': 'testCard',
            ...props,
          }}
        />
      );
      return renderResult;
    };
  });

  it('should display title and who has created and updated it last', async () => {
    render();

    expect(renderResult.getByTestId('testCard-header-title').textContent).toEqual(
      'some internal app'
    );
    expect(renderResult.getByTestId('testCard-subHeader-touchedBy-createdBy').textContent).toEqual(
      'Created byJJusta'
    );
    expect(renderResult.getByTestId('testCard-subHeader-touchedBy-updatedBy').textContent).toEqual(
      'Updated byMMara'
    );
  });

  it('should display Global effected scope', async () => {
    render();

    expect(renderResult.getByTestId('testCard-subHeader-effectScope-value').textContent).toEqual(
      'Applied globally'
    );
  });

  it('should display dates in expected format', () => {
    render();

    expect(renderResult.getByTestId('testCard-header-updated').textContent).toEqual(
      expect.stringMatching(/Last updated(\s seconds? ago|now)/)
    );
  });

  it('should display description if one exists', async () => {
    render();

    expect(renderResult.getByTestId('testCard-description').textContent).toEqual(item.description);
  });

  it('should display default empty value if description does not exist', async () => {
    item.description = undefined;
    render();

    expect(renderResult.getByTestId('testCard-description').textContent).toEqual('—');
  });

  it('should display OS and criteria conditions', () => {
    render();

    expect(renderResult.getByTestId('testCard-criteriaConditions').textContent).toEqual(
      ' OSIS WindowsAND process.hash.*IS 1234234659af249ddf3e40864e9fb241AND process.executable.caselessIS /one/two/three'
    );
  });

  it('should NOT show the action menu button if no actions were provided', async () => {
    render();
    const menuButton = await renderResult.queryByTestId('testCard-header-actions-button');

    expect(menuButton).toBeNull();
  });

  describe('and actions were defined', () => {
    let actions: ArtifactEntryCardProps['actions'];

    beforeEach(() => {
      actions = [
        {
          'data-test-subj': 'test-action',
          children: 'action one',
        },
      ];
    });

    it('should show the actions icon when actions were defined', () => {
      render({ actions });

      expect(renderResult.getByTestId('testCard-header-actions-button')).not.toBeNull();
    });

    it('should show popup with defined actions', async () => {
      render({ actions });
      await act(async () => {
        await fireEvent.click(renderResult.getByTestId('testCard-header-actions-button'));
      });

      const bodyHtmlElement = renderResult.baseElement as HTMLElement;

      expect(getByTestId(bodyHtmlElement, 'testCard-header-actions-popoverPanel')).not.toBeNull();
      expect(getByTestId(bodyHtmlElement, 'test-action')).not.toBeNull();
    });
  });

  describe('and artifact is defined per policy', () => {
    let policies: ArtifactEntryCardProps['policies'];

    beforeEach(() => {
      if (isTrustedApp(item)) {
        item.effectScope = {
          type: 'policy',
          policies: ['policy-1'],
        };
      } else {
        item.tags = ['policy:policy-1'];
      }

      policies = {
        'policy-1': {
          children: 'Policy one',
          'data-test-subj': 'policyMenuItem',
        },
      };
    });

    it('should display correct label with count of policies', () => {
      render({ policies });

      expect(renderResult.getByTestId('testCard-subHeader-effectScope-value').textContent).toEqual(
        'Applied to 1 policy'
      );
    });

    it('should display effected scope as a button', () => {
      render({ policies });

      expect(
        renderResult.getByTestId('testCard-subHeader-effectScope-popupMenu-button')
      ).not.toBeNull();
    });

    it('should show popup menu with list of associated policies when clicked', async () => {
      render({ policies });
      await act(async () => {
        await fireEvent.click(
          renderResult.getByTestId('testCard-subHeader-effectScope-popupMenu-button')
        );
      });

      expect(
        renderResult.getByTestId('testCard-subHeader-effectScope-popupMenu-popoverPanel')
      ).not.toBeNull();

      expect(renderResult.getByTestId('policyMenuItem').textContent).toEqual('Policy one');
    });

    it('should display policy ID if no policy menu item found in `policies` prop', async () => {
      render();
      await act(async () => {
        await fireEvent.click(
          renderResult.getByTestId('testCard-subHeader-effectScope-popupMenu-button')
        );
      });

      expect(
        renderResult.getByTestId('testCard-subHeader-effectScope-popupMenu-popoverPanel')
      ).not.toBeNull();

      expect(renderResult.getByText('policy-1').textContent).not.toBeNull();
    });
  });
});
