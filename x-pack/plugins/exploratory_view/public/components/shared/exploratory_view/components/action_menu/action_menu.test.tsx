/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '../../rtl_helpers';
import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { sampleAttribute } from '../../configurations/test_data/sample_attribute';
import * as pluginHook from '../../../../../hooks/use_plugin_context';
import { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { ExpViewActionMenuContent } from './action_menu';
import { noCasesPermissions as mockUseGetCasesPermissions } from '@kbn/observability-shared-plugin/public';
import * as obsHooks from '@kbn/observability-shared-plugin/public/hooks/use_get_user_cases_permissions';

jest.spyOn(pluginHook, 'usePluginContext').mockReturnValue({
  appMountParameters: {
    setHeaderActionMenu: jest.fn(),
  },
} as any);

jest.spyOn(obsHooks, 'useGetUserCasesPermissions').mockImplementation(
  () =>
    ({
      useGetUserCasesPermissions: jest.fn(() => mockUseGetCasesPermissions()),
    } as any)
);

describe('Action Menu', function () {
  afterAll(() => {
    jest.clearAllMocks();
  });

  it('should be able to click open in lens', async function () {
    const { findByText, core } = render(
      <ExpViewActionMenuContent
        lensAttributes={sampleAttribute as TypedLensByValueInput['attributes']}
        timeRange={{ to: 'now', from: 'now-10m' }}
      />
    );

    expect(await screen.findByText('Open in Lens')).toBeInTheDocument();

    fireEvent.click(await findByText('Open in Lens'));

    expect(core.lens?.navigateToPrefilledEditor).toHaveBeenCalledTimes(1);
    expect(core.lens?.navigateToPrefilledEditor).toHaveBeenCalledWith(
      {
        id: '',
        attributes: sampleAttribute,
        timeRange: { to: 'now', from: 'now-10m' },
      },
      {
        openInNewTab: true,
      }
    );
  });

  it('should be able to click save', async function () {
    const { findByText } = render(
      <ExpViewActionMenuContent
        lensAttributes={sampleAttribute as TypedLensByValueInput['attributes']}
      />
    );

    expect(await screen.findByText('Save')).toBeInTheDocument();

    fireEvent.click(await findByText('Save'));

    expect(await screen.findByText('Lens Save Modal Component')).toBeInTheDocument();
  });
});
