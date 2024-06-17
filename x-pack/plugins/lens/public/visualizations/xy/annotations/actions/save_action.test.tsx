/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { coreMock } from '@kbn/core/public/mocks';
import { toastsServiceMock } from '@kbn/core-notifications-browser-mocks/src/toasts_service.mock';
import { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import {
  XYByValueAnnotationLayerConfig,
  XYAnnotationLayerConfig,
  XYState,
  XYByReferenceAnnotationLayerConfig,
} from '../../types';
import { onSave, SaveModal } from './save_action';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import {
  EventAnnotationGroupConfig,
  PointInTimeEventAnnotationConfig,
} from '@kbn/event-annotation-common';
import { SavedObjectSaveModal } from '@kbn/saved-objects-plugin/public';
import { taggingApiMock } from '@kbn/saved-objects-tagging-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/public';

describe('annotation group save action', () => {
  describe('save modal', () => {
    const modalSaveArgs = {
      newCopyOnSave: false,
      isTitleDuplicateConfirmed: false,
      onTitleDuplicate: () => {},
    };

    it('reports new saved object attributes', async () => {
      const onSaveMock = jest.fn();
      const savedObjectsTagging = taggingApiMock.create();
      const wrapper = shallowWithIntl(
        <SaveModal
          domElement={document.createElement('div')}
          onSave={onSaveMock}
          savedObjectsTagging={savedObjectsTagging}
          title=""
          description=""
          tags={[]}
          showCopyOnSave={false}
        />
      );

      const newTitle = 'title';
      const newDescription = 'description';
      const myTags = ['my', 'many', 'tags'];

      (wrapper
        .find(SavedObjectSaveModal)
        .prop('options') as React.ReactElement)!.props.onTagsSelected(myTags);

      // ignore the linter, you need this await statement
      wrapper.find(SavedObjectSaveModal).prop('onSave')({
        newTitle,
        newDescription,
        ...modalSaveArgs,
      });

      expect(onSaveMock).toHaveBeenCalledTimes(1);
      expect(onSaveMock.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "closeModal": [Function],
            "isTitleDuplicateConfirmed": false,
            "newCopyOnSave": false,
            "newDescription": "description",
            "newTags": Array [
              "my",
              "many",
              "tags",
            ],
            "newTitle": "title",
            "onTitleDuplicate": [Function],
          },
        ]
      `);
    });

    it('shows existing saved object attributes', async () => {
      const savedObjectsTagging = taggingApiMock.create();

      const title = 'my title';
      const description = 'my description';
      const tags = ['my', 'tags'];

      const wrapper = shallowWithIntl(
        <SaveModal
          domElement={document.createElement('div')}
          onSave={() => {}}
          savedObjectsTagging={savedObjectsTagging}
          title={title}
          description={description}
          tags={tags}
          showCopyOnSave={true}
        />
      );

      const saveModal = wrapper.find(SavedObjectSaveModal);

      expect(saveModal.prop('title')).toBe(title);
      expect(saveModal.prop('description')).toBe(description);
      expect(saveModal.prop('showCopyOnSave')).toBe(true);
      expect((saveModal.prop('options') as React.ReactElement).props.initialSelection).toEqual(
        tags
      );
    });
  });

  describe('save routine', () => {
    const coreStart = coreMock.createStart();
    const layerId = 'mylayerid';

    const byValueLayer: XYByValueAnnotationLayerConfig = {
      layerId,
      layerType: 'annotations',
      indexPatternId: 'some-index-pattern',
      ignoreGlobalFilters: false,
      annotations: [
        {
          id: 'some-annotation-id',
          type: 'manual',
          key: {
            type: 'point_in_time',
            timestamp: 'timestamp',
          },
        } as PointInTimeEventAnnotationConfig,
      ],
    };

    const savedId = 'saved-id-123';

    const getProps: () => Parameters<typeof onSave>[0] = () => {
      const dataViews = dataViewPluginMocks.createStartContract();
      dataViews.get.mockResolvedValue({
        isPersisted: () => true,
      } as Partial<DataView> as DataView);

      return {
        state: {
          preferredSeriesType: 'area',
          legend: { isVisible: true, position: 'bottom' },
          layers: [{ layerId } as XYAnnotationLayerConfig],
        } as XYState,
        layer: byValueLayer,
        registerLibraryAnnotationGroup: jest.fn(),
        setState: jest.fn(),
        eventAnnotationService: {
          createAnnotationGroup: jest.fn(() => Promise.resolve({ id: savedId })),
          groupExistsWithTitle: jest.fn(() => Promise.resolve(false)),
          updateAnnotationGroup: jest.fn(),
          loadAnnotationGroup: jest.fn(),
          toExpression: jest.fn(),
          toFetchExpression: jest.fn(),
          renderEventAnnotationGroupSavedObjectFinder: jest.fn(),
        } as Partial<EventAnnotationServiceType> as EventAnnotationServiceType,
        toasts: toastsServiceMock.createStartContract(),
        modalOnSaveProps: {
          newTitle: 'my title',
          newDescription: 'my description',
          closeModal: jest.fn(),
          newTags: ['my-tag'],
          newCopyOnSave: false,
          isTitleDuplicateConfirmed: false,
          onTitleDuplicate: jest.fn(),
        },
        dataViews,
        goToAnnotationLibrary: () => Promise.resolve(),
        startServices: coreStart,
      };
    };

    let props: ReturnType<typeof getProps>;
    beforeEach(() => {
      props = getProps();
    });

    test('successful initial save', async () => {
      await onSave(props);

      const expectedConfig: EventAnnotationGroupConfig = {
        annotations: props.layer.annotations,
        indexPatternId: props.layer.indexPatternId,
        ignoreGlobalFilters: props.layer.ignoreGlobalFilters,
        title: props.modalOnSaveProps.newTitle,
        description: props.modalOnSaveProps.newDescription,
        tags: props.modalOnSaveProps.newTags,
      };

      expect(props.eventAnnotationService.createAnnotationGroup).toHaveBeenCalledWith(
        expectedConfig
      );

      expect(props.registerLibraryAnnotationGroup).toHaveBeenCalledWith({
        id: savedId,
        group: expectedConfig,
      });

      expect(props.modalOnSaveProps.closeModal).toHaveBeenCalled();

      expect((props.setState as jest.Mock).mock.calls).toMatchSnapshot();

      expect(props.toasts.addSuccess).toHaveBeenCalledTimes(1);
    });

    test('successful initial save with ad-hoc data view', async () => {
      const dataViewSpec = {
        id: 'some-adhoc-data-view-id',
      } as DataViewSpec;

      (props.dataViews.get as jest.Mock).mockResolvedValueOnce({
        isPersisted: () => false, // ad-hoc
        toSpec: () => dataViewSpec,
      } as Partial<DataView>);

      await onSave(props);

      const expectedConfig: EventAnnotationGroupConfig = {
        annotations: props.layer.annotations,
        indexPatternId: props.layer.indexPatternId,
        ignoreGlobalFilters: props.layer.ignoreGlobalFilters,
        title: props.modalOnSaveProps.newTitle,
        description: props.modalOnSaveProps.newDescription,
        tags: props.modalOnSaveProps.newTags,
        dataViewSpec,
      };

      expect(props.eventAnnotationService.createAnnotationGroup).toHaveBeenCalledWith(
        expectedConfig
      );

      expect(props.registerLibraryAnnotationGroup).toHaveBeenCalledWith({
        id: savedId,
        group: expectedConfig,
      });

      expect(props.modalOnSaveProps.closeModal).toHaveBeenCalled();

      expect((props.setState as jest.Mock).mock.calls).toMatchSnapshot();

      expect(props.toasts.addSuccess).toHaveBeenCalledTimes(1);
    });

    test('failed initial save', async () => {
      (props.eventAnnotationService.createAnnotationGroup as jest.Mock).mockRejectedValue(
        new Error('oh noooooo')
      );

      await onSave(props);

      expect(props.eventAnnotationService.createAnnotationGroup).toHaveBeenCalledWith({
        annotations: props.layer.annotations,
        indexPatternId: props.layer.indexPatternId,
        ignoreGlobalFilters: props.layer.ignoreGlobalFilters,
        title: props.modalOnSaveProps.newTitle,
        description: props.modalOnSaveProps.newDescription,
        tags: props.modalOnSaveProps.newTags,
      });

      expect(props.toasts.addError).toHaveBeenCalledTimes(1);

      expect(props.registerLibraryAnnotationGroup).not.toHaveBeenCalled();

      expect(props.modalOnSaveProps.closeModal).not.toHaveBeenCalled();

      expect(props.setState).not.toHaveBeenCalled();

      expect(props.toasts.addSuccess).not.toHaveBeenCalled();
    });

    test('updating an existing group', async () => {
      const annotationGroupId = 'my-group-id';

      const byReferenceLayer: XYByReferenceAnnotationLayerConfig = {
        ...props.layer,
        annotationGroupId,
        __lastSaved: {
          ...props.layer,
          title: 'old title',
          description: 'old description',
          tags: [],
        },
      };

      await onSave({ ...props, layer: byReferenceLayer });

      expect(props.eventAnnotationService.createAnnotationGroup).not.toHaveBeenCalled();

      expect(props.eventAnnotationService.updateAnnotationGroup).toHaveBeenCalledWith(
        {
          annotations: props.layer.annotations,
          indexPatternId: props.layer.indexPatternId,
          ignoreGlobalFilters: props.layer.ignoreGlobalFilters,
          title: props.modalOnSaveProps.newTitle,
          description: props.modalOnSaveProps.newDescription,
          tags: props.modalOnSaveProps.newTags,
        },
        annotationGroupId
      );

      expect(props.modalOnSaveProps.closeModal).toHaveBeenCalled();

      expect((props.setState as jest.Mock).mock.calls).toMatchSnapshot();

      expect(props.toasts.addSuccess).toHaveBeenCalledTimes(1);
    });

    test('saving an existing group as new', async () => {
      const annotationGroupId = 'my-group-id';

      const byReferenceLayer: XYByReferenceAnnotationLayerConfig = {
        ...props.layer,
        annotationGroupId,
        __lastSaved: {
          ...props.layer,
          title: 'old title',
          description: 'old description',
          tags: [],
        },
      };

      await onSave({
        ...props,
        layer: byReferenceLayer,
        modalOnSaveProps: { ...props.modalOnSaveProps, newCopyOnSave: true },
      });

      expect(props.eventAnnotationService.updateAnnotationGroup).not.toHaveBeenCalled();

      const expectedConfig: EventAnnotationGroupConfig = {
        annotations: props.layer.annotations,
        indexPatternId: props.layer.indexPatternId,
        ignoreGlobalFilters: props.layer.ignoreGlobalFilters,
        title: props.modalOnSaveProps.newTitle,
        description: props.modalOnSaveProps.newDescription,
        tags: props.modalOnSaveProps.newTags,
      };

      expect(props.eventAnnotationService.createAnnotationGroup).toHaveBeenCalledWith(
        expectedConfig
      );

      expect(props.registerLibraryAnnotationGroup).toHaveBeenCalledWith({
        id: savedId,
        group: expectedConfig,
      });

      expect(props.modalOnSaveProps.closeModal).toHaveBeenCalled();

      expect((props.setState as jest.Mock).mock.calls).toMatchSnapshot();

      expect(props.toasts.addSuccess).toHaveBeenCalledTimes(1);
    });

    it.each`
      existingGroup | newCopyOnSave | titleChanged | isTitleDuplicateConfirmed | expectPreventSave
      ${false}      | ${false}      | ${false}     | ${false}                  | ${true}
      ${false}      | ${false}      | ${false}     | ${true}                   | ${false}
      ${true}       | ${false}      | ${false}     | ${false}                  | ${false}
      ${true}       | ${true}       | ${false}     | ${false}                  | ${true}
      ${true}       | ${true}       | ${false}     | ${true}                   | ${false}
    `(
      'checks duplicate title when saving group',
      async ({
        existingGroup,
        newCopyOnSave,
        titleChanged,
        isTitleDuplicateConfirmed,
        expectPreventSave,
      }) => {
        (props.eventAnnotationService.groupExistsWithTitle as jest.Mock).mockResolvedValueOnce(
          true
        );

        const oldTitle = 'old title';
        let layer: XYAnnotationLayerConfig = byValueLayer;
        if (existingGroup) {
          const byReferenceLayer: XYByReferenceAnnotationLayerConfig = {
            ...props.layer,
            annotationGroupId: 'my-group-id',
            __lastSaved: {
              ...props.layer,
              title: oldTitle,
              description: 'description',
              tags: [],
            },
          };
          layer = byReferenceLayer;
        }

        const newTitle = titleChanged ? 'my changed title' : oldTitle;

        await onSave({
          ...props,
          layer,
          modalOnSaveProps: {
            ...props.modalOnSaveProps,
            newTitle,
            isTitleDuplicateConfirmed,
            newCopyOnSave,
          },
        });

        if (expectPreventSave) {
          expect(props.eventAnnotationService.updateAnnotationGroup).not.toHaveBeenCalled();

          expect(props.eventAnnotationService.createAnnotationGroup).not.toHaveBeenCalled();

          expect(props.modalOnSaveProps.closeModal).not.toHaveBeenCalled();

          expect(props.setState).not.toHaveBeenCalled();

          expect(props.toasts.addSuccess).not.toHaveBeenCalled();

          expect(props.modalOnSaveProps.onTitleDuplicate).toHaveBeenCalled();
        } else {
          expect(props.modalOnSaveProps.onTitleDuplicate).not.toHaveBeenCalled();

          expect(props.modalOnSaveProps.closeModal).toHaveBeenCalled();

          expect(props.setState).toHaveBeenCalled();

          expect(props.toasts.addSuccess).toHaveBeenCalledTimes(1);
        }
      }
    );
  });
});
