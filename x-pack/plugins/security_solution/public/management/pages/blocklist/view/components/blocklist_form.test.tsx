/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BlocklistConditionEntryField, OperatingSystem } from '@kbn/securitysolution-utils';
import { ENDPOINT_BLOCKLISTS_LIST_ID } from '@kbn/securitysolution-list-constants';

import { BlocklistEntry, BlockListForm } from './blocklist_form';
import {
  ArtifactFormComponentOnChangeCallbackProps,
  ArtifactFormComponentProps,
} from '../../../../components/artifact_list_page';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../common/mock/endpoint';
import { ERRORS } from '../../translations';
import { licenseService } from '../../../../../common/hooks/use_license';
import type { PolicyData } from '../../../../../../common/endpoint/types';
import { GLOBAL_ARTIFACT_TAG } from '../../../../../../common/endpoint/service/artifacts';

jest.mock('../../../../../common/hooks/use_license', () => {
  const licenseServiceInstance = {
    isPlatinumPlus: jest.fn(),
  };
  return {
    licenseService: licenseServiceInstance,
    useLicense: () => {
      return licenseServiceInstance;
    },
  };
});

describe('blocklist form', () => {
  let onChangeSpy: jest.Mock;
  let render: (props?: ArtifactFormComponentProps) => ReturnType<AppContextTestRender['render']>;
  let mockedContext: AppContextTestRender;

  function createEntry(field: BlocklistConditionEntryField, value: string[]): BlocklistEntry {
    return {
      field,
      operator: 'included',
      type: 'match_any',
      value,
    };
  }

  function createItem(
    overrides: Partial<ArtifactFormComponentProps['item']> = {}
  ): ArtifactFormComponentProps['item'] {
    const defaults: ArtifactFormComponentProps['item'] = {
      list_id: ENDPOINT_BLOCKLISTS_LIST_ID,
      name: '',
      description: '',
      entries: [],
      type: 'simple',
    };
    return {
      ...defaults,
      ...overrides,
    };
  }

  function createProps(
    overrides: Partial<ArtifactFormComponentProps> = {}
  ): ArtifactFormComponentProps {
    const defaults: ArtifactFormComponentProps = {
      item: createItem(),
      policies: [],
      policiesIsLoading: false,
      onChange: onChangeSpy,
      mode: 'create' as ArtifactFormComponentProps['mode'],
      disabled: false,
      error: undefined,
    };

    return {
      ...defaults,
      ...overrides,
    };
  }

  function createOnChangeArgs(
    overrides: Partial<ArtifactFormComponentOnChangeCallbackProps>
  ): ArtifactFormComponentOnChangeCallbackProps {
    const defaults = {
      item: createItem(),
      isValid: false,
    };
    return {
      ...defaults,
      ...overrides,
    };
  }

  beforeEach(() => {
    onChangeSpy = jest.fn();
    (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(true);
    mockedContext = createAppRootMockRenderer();
    render = (props = createProps()) => mockedContext.render(<BlockListForm {...props} />);
  });

  it('should hide details text when in edit mode', () => {
    render(createProps({ mode: 'edit' }));
    expect(screen.queryByTestId('blocklist-form-header-description')).toBeNull();
  });

  it('should show name required message after name input blur', () => {
    render();
    userEvent.click(screen.getByTestId('blocklist-form-name-input'));
    expect(screen.queryByText(ERRORS.NAME_REQUIRED)).toBeNull();
    userEvent.click(screen.getByTestId('blocklist-form-os-select'));
    expect(screen.queryByText(ERRORS.NAME_REQUIRED)).toBeTruthy();
  });

  it('should be invalid if no name', () => {
    render(createProps({ item: createItem({ name: 'test name' }) }));
    userEvent.clear(screen.getByTestId('blocklist-form-name-input'));
    const expected = createOnChangeArgs({ item: createItem({ name: '' }) });
    expect(onChangeSpy).toHaveBeenCalledWith(expected);
  });

  it('should correctly edit name', () => {
    render();
    userEvent.type(screen.getByTestId('blocklist-form-name-input'), 'z');
    const expected = createOnChangeArgs({
      item: createItem({ name: 'z' }),
    });
    expect(onChangeSpy).toHaveBeenCalledWith(expected);
  });

  it('should not require description', () => {
    render();
    expect(screen.getByTestId('blocklist-form-description-input').hasAttribute('required')).toEqual(
      false
    );
  });

  it('should correctly edit description', () => {
    render();
    userEvent.type(screen.getByTestId('blocklist-form-description-input'), 'z');
    const expected = createOnChangeArgs({
      item: createItem({ description: 'z' }),
    });
    expect(onChangeSpy).toHaveBeenCalledWith(expected);
  });

  it('should correctly default OS to windows', () => {
    render();
    expect(screen.getByTestId('blocklist-form-os-select').textContent).toEqual('Windows');
  });

  it('should allow user to select between 3 OSs', () => {
    render();
    userEvent.click(screen.getByTestId('blocklist-form-os-select'));
    expect(screen.queryAllByRole('option').length).toEqual(3);
    expect(screen.queryByRole('option', { name: 'Windows' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Linux' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Mac' })).toBeTruthy();
  });

  it('should correctly edit OS', () => {
    render();
    userEvent.click(screen.getByTestId('blocklist-form-os-select'));
    userEvent.click(screen.getByRole('option', { name: 'Linux' }));
    const expected = createOnChangeArgs({
      item: createItem({
        os_types: [OperatingSystem.LINUX],
        entries: [createEntry('file.hash.*', [])],
      }),
    });
    expect(onChangeSpy).toHaveBeenCalledWith(expected);
  });

  it('should correctly default field to hash', () => {
    render();
    expect(screen.getByTestId('blocklist-form-field-select').textContent).toEqual('Hash');
  });

  it('should allow all 3 fields when Windows OS is selected', () => {
    render();
    expect(screen.getByTestId('blocklist-form-os-select').textContent).toEqual('Windows');

    userEvent.click(screen.getByTestId('blocklist-form-field-select'));
    expect(screen.queryAllByRole('option').length).toEqual(3);
    expect(screen.queryByRole('option', { name: /hash/i })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /path/i })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /signature/i })).toBeTruthy();
  });

  it('should only allow hash and path fields when Linux OS is selected', () => {
    render(createProps({ item: createItem({ os_types: [OperatingSystem.LINUX] }) }));
    expect(screen.getByTestId('blocklist-form-os-select').textContent).toEqual('Linux');

    userEvent.click(screen.getByTestId('blocklist-form-field-select'));
    expect(screen.queryAllByRole('option').length).toEqual(2);
    expect(screen.queryByRole('option', { name: /hash/i })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /path/i })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /signature/i })).toBeNull();
  });

  it('should only allow hash and path fields when Mac OS is selected', () => {
    render(createProps({ item: createItem({ os_types: [OperatingSystem.MAC] }) }));
    expect(screen.getByTestId('blocklist-form-os-select').textContent).toEqual('Mac');

    userEvent.click(screen.getByTestId('blocklist-form-field-select'));
    expect(screen.queryAllByRole('option').length).toEqual(2);
    expect(screen.queryByRole('option', { name: /hash/i })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /path/i })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /signature/i })).toBeNull();
  });

  it('should correctly edit field', () => {
    render();
    userEvent.click(screen.getByTestId('blocklist-form-field-select'));
    userEvent.click(screen.getByRole('option', { name: /path/i }));
    const expected = createOnChangeArgs({
      item: createItem({
        entries: [createEntry('file.path', [])],
      }),
    });
    expect(onChangeSpy).toHaveBeenCalledWith(expected);
  });

  it('should correctly edit single value', () => {
    render();
    const hash = 'C3AB8FF13720E8AD9047DD39466B3C8974E592C2FA383D4A3960714CAEF0C4F2';
    userEvent.type(screen.getByRole('combobox'), `${hash}{enter}`);
    const expected = createOnChangeArgs({
      item: createItem({
        entries: [createEntry('file.hash.*', [hash])],
      }),
    });
    expect(onChangeSpy).toHaveBeenCalledWith(expected);
  });

  it('should correctly edit comma delimited value', () => {
    render();
    const hashes = [
      'C3AB8FF13720E8AD9047DD39466B3C8974E592C2FA383D4A3960714CAEF0C4F2',
      '4F4C17F77EC2483C49A9543B21AA75862F8F04F2D8806507E08086E21A51222C',
    ];
    userEvent.type(screen.getByRole('combobox'), `${hashes.join(',')}{enter}`);
    const expected = createOnChangeArgs({
      item: createItem({
        entries: [createEntry('file.hash.*', hashes)],
      }),
    });
    expect(onChangeSpy).toHaveBeenCalledWith(expected);
  });

  it('should remove duplicate values with warning if entering multi value', () => {
    render();
    const hash = 'C3AB8FF13720E8AD9047DD39466B3C8974E592C2FA383D4A3960714CAEF0C4F2';
    const hashes = [hash, hash];
    userEvent.type(screen.getByRole('combobox'), `${hashes.join(',')}{enter}`);
    expect(screen.queryByText(ERRORS.DUPLICATE_VALUES)).toBeTruthy();
    const expected = createOnChangeArgs({
      item: createItem({
        entries: [createEntry('file.hash.*', [hash])],
      }),
    });
    expect(onChangeSpy).toHaveBeenCalledWith(expected);
  });

  it('should show value required after value input blur', () => {
    render(createProps({ item: createItem({ entries: [createEntry('file.hash.*', [])] }) }));
    userEvent.click(screen.getByRole('combobox'));
    expect(screen.queryByText(ERRORS.VALUE_REQUIRED)).toBeNull();
    userEvent.click(screen.getByTestId('blocklist-form-os-select'));
    expect(screen.queryByText(ERRORS.VALUE_REQUIRED)).toBeTruthy();
  });

  it('should require at least one value', () => {
    render(
      createProps({
        item: createItem({
          entries: [
            createEntry('file.hash.*', [
              '202cb962ac59075b964b07152d234b70',
              '7110eda4d09e062aa5e4a390b0a572ac0d2c0220',
              '5994471ABB01112AFCC18159F6CC74B4F511B99806DA59B3CAF5A9C173CACFC5',
            ]),
          ],
        }),
      })
    );
    userEvent.click(screen.getByRole('button', { name: /clear/i }));
    const expected = createOnChangeArgs({
      item: createItem({ entries: [createEntry('file.hash.*', [])] }),
    });
    expect(onChangeSpy).toHaveBeenCalledWith(expected);
  });

  it('should validate that hash values are valid', () => {
    render();
    const invalidHashes = ['foo', 'bar'];
    userEvent.type(screen.getByRole('combobox'), `${invalidHashes.join(',')}{enter}`);
    expect(screen.queryByText(ERRORS.INVALID_HASH)).toBeTruthy();
    const expected = createOnChangeArgs({
      item: createItem({
        entries: [createEntry('file.hash.*', invalidHashes)],
      }),
    });
    expect(onChangeSpy).toHaveBeenCalledWith(expected);
  });

  it('should warn if path values invalid', () => {
    const item = createItem({
      os_types: [OperatingSystem.LINUX],
      entries: [createEntry('file.path', ['/some/valid/path'])],
    });
    render(createProps({ item }));
    userEvent.type(screen.getByRole('combobox'), 'notavalidpath{enter}');
    expect(screen.queryByText(ERRORS.INVALID_PATH)).toBeTruthy();
  });

  it('should warn if single duplicate value entry', () => {
    const hash = 'C3AB8FF13720E8AD9047DD39466B3C8974E592C2FA383D4A3960714CAEF0C4F2';
    const item = createItem({
      entries: [createEntry('file.hash.*', [hash])],
    });
    render(createProps({ item }));
    userEvent.type(screen.getByRole('combobox'), `${hash}{enter}`);
    expect(screen.queryByText(ERRORS.DUPLICATE_VALUE)).toBeTruthy();
  });

  it('should default to global policy', () => {
    render();
    expect(screen.getByTestId('globalPolicy')).toBeEnabled();
  });

  it('should correctly edit policies', () => {
    const policies: PolicyData[] = [
      {
        id: 'policy-id-123',
        name: 'some-policy-123',
      },
      {
        id: 'policy-id-456',
        name: 'some-policy-456',
      },
    ] as PolicyData[];
    render(createProps({ policies }));
    const byPolicyButton = screen.getByTestId('perPolicy');
    userEvent.click(byPolicyButton);
    expect(byPolicyButton).toBeEnabled();

    userEvent.click(screen.getByText(policies[1].name));
    const expected = createOnChangeArgs({
      item: createItem({
        tags: [`policy:${policies[1].id}`],
      }),
    });
    expect(onChangeSpy).toHaveBeenCalledWith(expected);
  });

  it('should correctly retain selected policies when toggling between global/by policy', () => {
    const policies: PolicyData[] = [
      {
        id: 'policy-id-123',
        name: 'some-policy-123',
      },
      {
        id: 'policy-id-456',
        name: 'some-policy-456',
      },
    ] as PolicyData[];
    render(createProps({ policies, item: createItem({ tags: [`policy:${policies[1].id}`] }) }));
    expect(screen.getByTestId('globalPolicy')).toBeEnabled();

    const byPolicyButton = screen.getByTestId('perPolicy');
    userEvent.click(byPolicyButton);
    expect(byPolicyButton).toBeEnabled();
    userEvent.click(screen.getByText(policies[0].name));
    const expected = createOnChangeArgs({
      item: createItem({
        tags: policies.map((policy) => `policy:${policy.id}`),
      }),
    });
    expect(onChangeSpy).toHaveBeenCalledWith(expected);
  });

  it('should be valid if all required inputs complete', () => {
    const validItem: ArtifactFormComponentProps['item'] = {
      list_id: ENDPOINT_BLOCKLISTS_LIST_ID,
      name: 'test name',
      description: 'test description',
      entries: [
        createEntry('file.hash.*', [
          '202cb962ac59075b964b07152d234b70',
          '7110eda4d09e062aa5e4a390b0a572ac0d2c0220',
          '5994471ABB01112AFCC18159F6CC74B4F511B99806DA59B3CAF5A9C173CACFC5',
        ]),
      ],
      os_types: [OperatingSystem.WINDOWS],
      tags: [GLOBAL_ARTIFACT_TAG],
      type: 'simple',
    };
    render(createProps({ item: validItem }));

    userEvent.type(screen.getByTestId('blocklist-form-name-input'), 'z');
    const expected = createOnChangeArgs({
      isValid: true,
      item: { ...validItem, name: 'test namez' },
    });
    expect(onChangeSpy).toHaveBeenCalledWith(expected);
  });
});
