/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { ArtifactEntryCard, ArtifactEntryCardProps } from './artifact_entry_card';
import { TrustedAppGenerator } from '../../../../common/endpoint/data_generators/trusted_app_generator';
import { TrustedApp } from '../../../../common/endpoint/types';

// FIXME:PT DEV ONLY - REMOVE IT
// {
//       description: 'Generator says we trust CrowdStrike Falcon',
//       name: 'CrowdStrike Falcon',
//       os: 'windows',
//       effectScope: { type: 'global' },
//       entries: [
//         {
//           field: 'process.hash.*',
//           operator: 'included',
//           type: 'match',
//           value: '1234234659af249ddf3e40864e9fb241'
//         },
//         {
//           field: 'process.executable.caseless',
//           operator: 'included',
//           type: 'match',
//           value: '/one/two/three'
//         }
//       ],
//       id: '91dcb211-5cc1-47df-899b-320090f55a0b',
//       version: 'jy6j0',
//       created_at: '2021-07-01T00:00:00.000Z',
//       updated_at: '2021-09-09T19:26:10.795Z',
//       created_by: '`Justa`',
//       updated_by: 'Mara'
//     }

describe('when using the ArtifactEntryCard component', () => {
  let trustedApp: TrustedApp;
  let appTestContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let render: (props?: ArtifactEntryCardProps) => ReturnType<AppContextTestRender['render']>;

  beforeEach(() => {
    trustedApp = new TrustedAppGenerator('seed').generate({
      name: 'some internal app',
      description: 'this app is trusted by the company',
      created_at: new Date('2021-07-01').toISOString(),
    });
    appTestContext = createAppRootMockRenderer();
    render = (props: Partial<ArtifactEntryCardProps> = {}) => {
      renderResult = appTestContext.render(
        <ArtifactEntryCard
          {...{
            item: trustedApp,
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

    expect(renderResult.getByTestId('testCard-description').textContent).toEqual(
      trustedApp.description
    );
  });

  it('should display default empty value if description does not exist', async () => {
    trustedApp.description = undefined;
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
    it.todo('should show the actions icon when actions were defined');

    it.todo('should show popup with defined actions');
  });

  describe('and artifact is defined per policy', () => {
    it.todo('should display correct label with count of policies');

    it.todo('should display effected scope as a button');

    it.todo('should show popup menu with list of associated policies when clicked');
  });

  describe('and a basic/simple Exception is used', () => {
    it.todo('should render the card');
  });
});
