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
    getAll: jest.fn(),
    create: jest.fn(),
  } as any;

  beforeEach(() => {
    savedObjectTagAssignmentService.updateTagAssignments.mockReset();
    savedObjectTagClient.getAll.mockReset();
    savedObjectTagClient.create.mockReset();
  });

  it('should create Managed and System tags when tagKibanaAssets with System package', async () => {
    savedObjectTagClient.getAll.mockResolvedValue([]);
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
    });

    expect(savedObjectTagClient.create).toHaveBeenCalledWith(
      {
        name: 'Managed',
        description: '',
        color: '#FFFFFF',
      },
      { id: 'managed', overwrite: true, refresh: false }
    );
    expect(savedObjectTagClient.create).toHaveBeenCalledWith(
      {
        name: 'System',
        description: '',
        color: '#FFFFFF',
      },
      { id: 'system', overwrite: true, refresh: false }
    );
    expect(savedObjectTagAssignmentService.updateTagAssignments).toHaveBeenCalledWith({
      tags: ['managed', 'system'],
      assign: kibanaAssets.dashboard,
      unassign: [],
      refresh: false,
    });
  });

  it('should only assign Managed and System tags when tags already exist', async () => {
    savedObjectTagClient.getAll.mockResolvedValue([
      { id: 'managed', name: 'Managed' },
      { id: 'system', name: 'System' },
    ]);
    const kibanaAssets = { dashboard: [{ id: 'dashboard1', type: 'dashboard' }] } as any;

    await tagKibanaAssets({
      savedObjectTagAssignmentService,
      savedObjectTagClient,
      kibanaAssets,
      pkgTitle: 'System',
      pkgName: 'system',
    });

    expect(savedObjectTagClient.create).not.toHaveBeenCalled();
    expect(savedObjectTagAssignmentService.updateTagAssignments).toHaveBeenCalledWith({
      tags: ['managed', 'system'],
      assign: kibanaAssets.dashboard,
      unassign: [],
      refresh: false,
    });
  });

  it('should skip non taggable asset types', async () => {
    savedObjectTagClient.getAll.mockResolvedValue([]);
    savedObjectTagClient.create.mockImplementation(({ name }: { name: string }) =>
      Promise.resolve({ id: name.toLowerCase(), name })
    );
    const kibanaAssets = {
      dashboard: [{ id: 'dashboard1', type: 'dashboard' }],
      search: [{ id: 's1', type: 'search' }],
      visualization: [{ id: 'v1', type: 'visualization' }],
    } as any;

    await tagKibanaAssets({
      savedObjectTagAssignmentService,
      savedObjectTagClient,
      kibanaAssets,
      pkgTitle: 'System',
      pkgName: 'system',
    });

    expect(savedObjectTagAssignmentService.updateTagAssignments).toHaveBeenCalledWith({
      tags: ['managed', 'system'],
      assign: [...kibanaAssets.dashboard, ...kibanaAssets.visualization],
      unassign: [],
      refresh: false,
    });
  });

  it('should do nothing if no taggable assets', async () => {
    const kibanaAssets = { search: [{ id: 's1', type: 'search' }] } as any;

    await tagKibanaAssets({
      savedObjectTagAssignmentService,
      savedObjectTagClient,
      kibanaAssets,
      pkgTitle: 'System',
      pkgName: 'system',
    });

    expect(savedObjectTagAssignmentService.updateTagAssignments).not.toHaveBeenCalled();
  });
});
