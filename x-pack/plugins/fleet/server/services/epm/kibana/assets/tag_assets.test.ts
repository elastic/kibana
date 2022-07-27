/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IAssignmentService, ITagsClient } from '@kbn/saved-objects-tagging-plugin/server';

import { tagKibanaAssets } from './tag_assets';

describe('tagKibanaAssets', () => {
  const savedObjectTagAssignmentService = {
    updateTagAssignments: jest.fn(),
  } as IAssignmentService;
  const savedObjectTagClient = {
    getAll: jest.fn(),
    create: jest.fn(),
  } as ITagsClient;

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
    const kibanaAssets = { dashboard: [{ id: 'dashboard1', type: 'dashboard' }] };

    await tagKibanaAssets({
      savedObjectTagAssignmentService,
      savedObjectTagClient,
      kibanaAssets,
      pkgTitle: 'System',
    });

    expect(savedObjectTagClient.create).toHaveBeenCalledWith({
      name: 'Managed',
      description: '',
      color: '#FFFFFF',
    });
    expect(savedObjectTagClient.create).toHaveBeenCalledWith({
      name: 'System',
      description: '',
      color: '#FFFFFF',
    });
    expect(savedObjectTagAssignmentService.updateTagAssignments).toHaveBeenCalledWith({
      tags: ['managed', 'system'],
      assign: kibanaAssets.dashboard,
      unassign: [],
    });
  });

  it('should only assign Managed and System tags when tags already exist', async () => {
    savedObjectTagClient.getAll.mockResolvedValue([
      { id: 'managed', name: 'Managed' },
      { id: 'system', name: 'System' },
    ]);
    const kibanaAssets = { dashboard: [{ id: 'dashboard1', type: 'dashboard' }] };

    await tagKibanaAssets({
      savedObjectTagAssignmentService,
      savedObjectTagClient,
      kibanaAssets,
      pkgTitle: 'System',
    });

    expect(savedObjectTagClient.create).not.toHaveBeenCalled();
    expect(savedObjectTagAssignmentService.updateTagAssignments).toHaveBeenCalledWith({
      tags: ['managed', 'system'],
      assign: kibanaAssets.dashboard,
      unassign: [],
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
    };

    await tagKibanaAssets({
      savedObjectTagAssignmentService,
      savedObjectTagClient,
      kibanaAssets,
      pkgTitle: 'System',
    });

    expect(savedObjectTagAssignmentService.updateTagAssignments).toHaveBeenCalledWith({
      tags: ['managed', 'system'],
      assign: [...kibanaAssets.dashboard, ...kibanaAssets.visualization],
      unassign: [],
    });
  });

  it('should do nothing if no taggable assets', async () => {
    const kibanaAssets = { search: [{ id: 's1', type: 'search' }] };

    await tagKibanaAssets({
      savedObjectTagAssignmentService,
      savedObjectTagClient,
      kibanaAssets,
      pkgTitle: 'System',
    });

    expect(savedObjectTagAssignmentService.updateTagAssignments).not.toHaveBeenCalled();
  });
});
