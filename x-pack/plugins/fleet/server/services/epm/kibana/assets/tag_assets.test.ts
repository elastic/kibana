/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tagKibanaAssets } from './tag_assets';

describe('tagKibanaAssets', () => {
  const savedObjectTagAssignmentService = {
    updateTagAssignments: jest.fn(),
  } as any;
  const savedObjectTagClient = {
    get: jest.fn(),
    create: jest.fn(),
  } as any;

  beforeEach(() => {
    savedObjectTagAssignmentService.updateTagAssignments.mockReset();
    savedObjectTagClient.get.mockReset();
    savedObjectTagClient.create.mockReset();
  });

  it('should create Managed and System tags when tagKibanaAssets with System package when no tags exist', async () => {
    savedObjectTagClient.get.mockRejectedValue(new Error('not found'));
    savedObjectTagClient.create.mockImplementation(({ name }: { name: string }) =>
      Promise.resolve({ id: name.toLowerCase(), name })
    );
    const kibanaAssets = { dashboard: [{ id: 'dashboard1', type: 'dashboard' }] } as any;

    await tagKibanaAssets({
      savedObjectTagAssignmentService,
      savedObjectTagClient,
      kibanaAssets,
      pkgTitle: 'System',
      pkgName: 'system',
      spaceId: 'default',
      importedAssets: [],
    });

    expect(savedObjectTagClient.create).toHaveBeenCalledWith(
      {
        name: 'Managed',
        description: '',
        color: '#FFFFFF',
      },
      { id: 'fleet-managed-default', overwrite: true, refresh: false }
    );
    expect(savedObjectTagClient.create).toHaveBeenCalledWith(
      {
        name: 'System',
        description: '',
        color: '#FFFFFF',
      },
      { id: 'fleet-pkg-system-default', overwrite: true, refresh: false }
    );
    expect(savedObjectTagAssignmentService.updateTagAssignments).toHaveBeenCalledWith({
      tags: ['fleet-managed-default', 'fleet-pkg-system-default'],
      assign: kibanaAssets.dashboard,
      unassign: [],
      refresh: false,
    });
  });

  it('should only assign Managed and System tags when tags already exist', async () => {
    savedObjectTagClient.get.mockResolvedValue({ name: '', color: '', description: '' });
    const kibanaAssets = { dashboard: [{ id: 'dashboard1', type: 'dashboard' }] } as any;

    await tagKibanaAssets({
      savedObjectTagAssignmentService,
      savedObjectTagClient,
      kibanaAssets,
      pkgTitle: 'System',
      pkgName: 'system',
      spaceId: 'default',
      importedAssets: [],
    });

    expect(savedObjectTagClient.create).not.toHaveBeenCalled();
    expect(savedObjectTagAssignmentService.updateTagAssignments).toHaveBeenCalledWith({
      tags: ['fleet-managed-default', 'fleet-pkg-system-default'],
      assign: kibanaAssets.dashboard,
      unassign: [],
      refresh: false,
    });
  });

  it('should use destinationId instead of original SO id if imported asset has it', async () => {
    savedObjectTagClient.get.mockResolvedValue({ name: '', color: '', description: '' });
    const kibanaAssets = { dashboard: [{ id: 'dashboard1', type: 'dashboard' }] } as any;

    await tagKibanaAssets({
      savedObjectTagAssignmentService,
      savedObjectTagClient,
      kibanaAssets,
      pkgTitle: 'System',
      pkgName: 'system',
      spaceId: 'default',
      importedAssets: [{ id: 'dashboard1', destinationId: 'destination1' } as any],
    });

    expect(savedObjectTagClient.create).not.toHaveBeenCalled();
    expect(savedObjectTagAssignmentService.updateTagAssignments).toHaveBeenCalledWith({
      tags: ['fleet-managed-default', 'fleet-pkg-system-default'],
      assign: [{ id: 'destination1', type: 'dashboard' }],
      unassign: [],
      refresh: false,
    });
  });

  it('should skip non taggable asset types', async () => {
    savedObjectTagClient.get.mockRejectedValue(new Error('tag not found'));
    savedObjectTagClient.create.mockImplementation(({ name }: { name: string }) =>
      Promise.resolve({ id: name.toLowerCase(), name })
    );
    const kibanaAssets = {
      dashboard: [{ id: 'dashboard1', type: 'dashboard' }],
      search: [{ id: 's1', type: 'search' }],
      config: [{ id: 'c1', type: 'config' }],
      visualization: [{ id: 'v1', type: 'visualization' }],
      osquery_pack_asset: [{ id: 'osquery-pack-asset1', type: 'osquery-pack-asset' }],
      osquery_saved_query: [{ id: 'osquery_saved_query1', type: 'osquery_saved_query' }],
    } as any;

    await tagKibanaAssets({
      savedObjectTagAssignmentService,
      savedObjectTagClient,
      kibanaAssets,
      pkgTitle: 'System',
      pkgName: 'system',
      spaceId: 'default',
      importedAssets: [],
    });

    expect(savedObjectTagAssignmentService.updateTagAssignments).toHaveBeenCalledWith({
      tags: ['fleet-managed-default', 'fleet-pkg-system-default'],
      assign: [
        ...kibanaAssets.dashboard,
        ...kibanaAssets.search,
        ...kibanaAssets.visualization,
        ...kibanaAssets.osquery_pack_asset,
        ...kibanaAssets.osquery_saved_query,
      ],
      unassign: [],
      refresh: false,
    });
  });

  it('should do nothing if no taggable assets', async () => {
    const kibanaAssets = { config: [{ id: 'c1', type: 'config' }] } as any;

    await tagKibanaAssets({
      savedObjectTagAssignmentService,
      savedObjectTagClient,
      kibanaAssets,
      pkgTitle: 'System',
      pkgName: 'system',
      spaceId: 'default',
      importedAssets: [],
    });

    expect(savedObjectTagAssignmentService.updateTagAssignments).not.toHaveBeenCalled();
  });

  it('should use legacy managed tag if it exists', async () => {
    savedObjectTagClient.get.mockImplementation(async (id: string) => {
      if (id === 'managed') return { name: 'managed', description: '', color: '' };

      throw new Error('not found');
    });

    savedObjectTagClient.create.mockImplementation(({ name }: { name: string }) =>
      Promise.resolve({ id: name.toLowerCase(), name })
    );
    const kibanaAssets = { dashboard: [{ id: 'dashboard1', type: 'dashboard' }] } as any;

    await tagKibanaAssets({
      savedObjectTagAssignmentService,
      savedObjectTagClient,
      kibanaAssets,
      pkgTitle: 'System',
      pkgName: 'system',
      spaceId: 'default',
      importedAssets: [],
    });

    expect(savedObjectTagClient.create).not.toHaveBeenCalledWith(
      {
        name: 'Managed',
        description: '',
        color: '#FFFFFF',
      },
      { id: 'fleet-managed-default', overwrite: true, refresh: false }
    );

    expect(savedObjectTagClient.create).toHaveBeenCalledWith(
      {
        name: 'System',
        description: '',
        color: '#FFFFFF',
      },
      { id: 'fleet-pkg-system-default', overwrite: true, refresh: false }
    );
    expect(savedObjectTagAssignmentService.updateTagAssignments).toHaveBeenCalledWith({
      tags: ['managed', 'fleet-pkg-system-default'],
      assign: kibanaAssets.dashboard,
      unassign: [],
      refresh: false,
    });
  });

  it('should use legacy package tag if it exists', async () => {
    savedObjectTagClient.get.mockImplementation(async (id: string) => {
      if (id === 'system') return { name: 'system', description: '', color: '' };

      throw new Error('not found');
    });

    savedObjectTagClient.create.mockImplementation(({ name }: { name: string }) =>
      Promise.resolve({ id: name.toLowerCase(), name })
    );
    const kibanaAssets = { dashboard: [{ id: 'dashboard1', type: 'dashboard' }] } as any;

    await tagKibanaAssets({
      savedObjectTagAssignmentService,
      savedObjectTagClient,
      kibanaAssets,
      pkgTitle: 'System',
      pkgName: 'system',
      spaceId: 'default',
      importedAssets: [],
    });

    expect(savedObjectTagClient.create).toHaveBeenCalledWith(
      {
        name: 'Managed',
        description: '',
        color: '#FFFFFF',
      },
      { id: 'fleet-managed-default', overwrite: true, refresh: false }
    );

    expect(savedObjectTagClient.create).not.toHaveBeenCalledWith(
      {
        name: 'System',
        description: '',
        color: '#FFFFFF',
      },
      { id: 'system', overwrite: true, refresh: false }
    );
    expect(savedObjectTagAssignmentService.updateTagAssignments).toHaveBeenCalledWith({
      tags: ['fleet-managed-default', 'system'],
      assign: kibanaAssets.dashboard,
      unassign: [],
      refresh: false,
    });
  });

  it('should use both legacy tags if they exist', async () => {
    savedObjectTagClient.get.mockImplementation(async (id: string) => {
      if (id === 'managed') return { name: 'managed', description: '', color: '' };
      if (id === 'system') return { name: 'system', description: '', color: '' };

      throw new Error('not found');
    });

    savedObjectTagClient.create.mockImplementation(({ name }: { name: string }) =>
      Promise.resolve({ id: name.toLowerCase(), name })
    );
    const kibanaAssets = { dashboard: [{ id: 'dashboard1', type: 'dashboard' }] } as any;

    await tagKibanaAssets({
      savedObjectTagAssignmentService,
      savedObjectTagClient,
      kibanaAssets,
      pkgTitle: 'System',
      pkgName: 'system',
      spaceId: 'default',
      importedAssets: [],
    });

    expect(savedObjectTagClient.create).not.toHaveBeenCalled();
    expect(savedObjectTagAssignmentService.updateTagAssignments).toHaveBeenCalledWith({
      tags: ['managed', 'system'],
      assign: kibanaAssets.dashboard,
      unassign: [],
      refresh: false,
    });
  });
});
