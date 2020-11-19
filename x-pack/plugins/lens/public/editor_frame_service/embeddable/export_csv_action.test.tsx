/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  isErrorEmbeddable,
  IContainer,
  ErrorEmbeddable,
} from 'src/plugins/dashboard/public/embeddable_plugin';
import { DashboardContainer } from 'src/plugins/dashboard/public/application/embeddable';
import {
  getSampleDashboardInput,
  getSampleDashboardPanel,
} from 'src/plugins/dashboard/public/application/test_helpers';
import {
  CONTACT_CARD_EMBEDDABLE,
  ContactCardEmbeddableFactory,
  ContactCardEmbeddable,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
} from 'src/plugins/dashboard/public/embeddable_plugin_test_samples';
import { coreMock } from 'src/core/public/mocks';
import { CoreStart } from 'kibana/public';
import { ExportCSVAction } from './export_csv_action';
import { embeddablePluginMock } from 'src/plugins/embeddable/public/mocks';
import { DataPublicPluginStart } from 'src/plugins/data/public/types';
import { dataPluginMock } from 'src/plugins/data/public/mocks';
import { LINE_FEED_CHARACTER } from 'src/plugins/data/public/exports/export_csv';

describe('Export CSV action', () => {
  const { setup, doStart } = embeddablePluginMock.createInstance();
  setup.registerEmbeddableFactory(
    CONTACT_CARD_EMBEDDABLE,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new ContactCardEmbeddableFactory((() => null) as any, {} as any)
  );
  const start = doStart();

  let container: DashboardContainer;
  let embeddable: ContactCardEmbeddable;
  let coreStart: CoreStart;
  let dataMock: jest.Mocked<DataPublicPluginStart>;

  beforeEach(async () => {
    coreStart = coreMock.createStart();
    coreStart.savedObjects.client = {
      ...coreStart.savedObjects.client,
      get: jest.fn().mockImplementation(() => ({ attributes: { title: 'Holy moly' } })),
      find: jest.fn().mockImplementation(() => ({ total: 15 })),
      create: jest.fn().mockImplementation(() => ({ id: 'brandNewSavedObject' })),
    };

    const options = {
      ExitFullScreenButton: () => null,
      SavedObjectFinder: () => null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      application: {} as any,
      embeddable: start,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inspector: {} as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      notifications: {} as any,
      overlays: coreStart.overlays,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      savedObjectMetaData: {} as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      uiActions: {} as any,
    };
    const input = getSampleDashboardInput({
      panels: {
        '123': getSampleDashboardPanel<ContactCardEmbeddableInput>({
          explicitInput: { firstName: 'Kibanana', id: '123' },
          type: CONTACT_CARD_EMBEDDABLE,
        }),
      },
    });
    container = new DashboardContainer(input, options);
    dataMock = dataPluginMock.createStartContract();

    const contactCardEmbeddable = await container.addNewEmbeddable<
      ContactCardEmbeddableInput,
      ContactCardEmbeddableOutput,
      ContactCardEmbeddable
    >(CONTACT_CARD_EMBEDDABLE, {
      firstName: 'Kibana',
    });

    if (isErrorEmbeddable(contactCardEmbeddable)) {
      throw new Error('Failed to create embeddable');
    } else {
      embeddable = contactCardEmbeddable;
    }
  });

  test('Download is incompatible with embeddables without getInspectorAdapters implementation', async () => {
    const action = new ExportCSVAction({ core: coreStart, data: dataMock });
    const errorEmbeddable = new ErrorEmbeddable(
      'Wow what an awful error',
      { id: ' 404' },
      embeddable.getRoot() as IContainer
    );
    expect(await action.isCompatible({ embeddable: errorEmbeddable })).toBe(false);
  });

  test('Should download a compatible Embeddable', async () => {
    const action = new ExportCSVAction({ core: coreStart, data: dataMock });
    const result = ((await action.execute({ embeddable, asString: true })) as unknown) as
      | undefined
      | Record<string, string>;
    expect(result).toEqual({
      'Hello Kibana.csv': `First Name,Last Name${LINE_FEED_CHARACTER}Kibana,undefined${LINE_FEED_CHARACTER}`,
    });
  });

  test('Should not download incompatible Embeddable', async () => {
    const action = new ExportCSVAction({ core: coreStart, data: dataMock });
    const errorEmbeddable = new ErrorEmbeddable(
      'Wow what an awful error',
      { id: ' 404' },
      embeddable.getRoot() as IContainer
    );
    const result = ((await action.execute({
      embeddable: errorEmbeddable,
      asString: true,
    })) as unknown) as undefined | Record<string, string>;
    expect(result).toBeUndefined();
  });
});
