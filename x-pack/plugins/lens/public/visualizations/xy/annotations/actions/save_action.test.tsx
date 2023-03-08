/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { toastsServiceMock } from '@kbn/core-notifications-browser-mocks/src/toasts_service.mock';
import { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import { XYByValueAnnotationLayerConfig, XYAnnotationLayerConfig, XYState } from '../../types';
import { onSave, SaveModal } from './save_action';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { PointInTimeEventAnnotationConfig } from '@kbn/event-annotation-plugin/common';
import { SavedObjectSaveModal } from '@kbn/saved-objects-plugin/public';
import { taggingApiMock } from '@kbn/saved-objects-tagging-plugin/public/mocks';

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
        />
      );

      const newTitle = 'title';
      const newDescription = 'description';
      const myTags = ['my', 'many', 'tags'];

      (wrapper
        .find(SavedObjectSaveModal)
        .prop('options') as React.ReactElement)!.props.onTagsSelected(myTags);

      // ignore the linter, you need this await statement
      await wrapper.find(SavedObjectSaveModal).prop('onSave')({
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
  });

  describe('save routine', () => {
    const layerId = 'mylayerid';

    const layer: XYByValueAnnotationLayerConfig = {
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

    const getProps: () => Parameters<typeof onSave>[0] = () => ({
      state: {
        preferredSeriesType: 'area',
        legend: { isVisible: true, position: 'bottom' },
        layers: [{ layerId } as XYAnnotationLayerConfig],
      } as XYState,
      layer,
      setState: jest.fn(),
      eventAnnotationService: {
        createAnnotationGroup: jest.fn(() => Promise.resolve({ id: savedId })),
        loadAnnotationGroup: jest.fn(),
        toExpression: jest.fn(),
        toFetchExpression: jest.fn(),
        renderEventAnnotationGroupSavedObjectFinder: jest.fn(),
      } as EventAnnotationServiceType,
      toasts: toastsServiceMock.createStartContract(),
      modalOnSaveProps: {
        newTitle: 'my title',
        newDescription: 'my description',
        closeModal: jest.fn(),
        newTags: ['my-tag'],
        newCopyOnSave: false,
        isTitleDuplicateConfirmed: false,
        onTitleDuplicate: () => {},
      },
    });

    let props: ReturnType<typeof getProps>;
    beforeEach(() => {
      props = getProps();
    });

    test('successful initial save', async () => {
      await onSave(props);

      expect(props.eventAnnotationService.createAnnotationGroup).toHaveBeenCalledWith({
        ...props.layer,
        title: props.modalOnSaveProps.newTitle,
        description: props.modalOnSaveProps.newDescription,
        tags: props.modalOnSaveProps.newTags,
      });

      expect((props.setState as jest.Mock).mock.calls).toMatchSnapshot();

      expect(props.toasts.addSuccess).toHaveBeenCalledTimes(1);
    });

    test('failed initial save', async () => {
      (props.eventAnnotationService.createAnnotationGroup as jest.Mock).mockRejectedValue(
        new Error('oh noooooo')
      );

      await onSave(props);

      expect(props.eventAnnotationService.createAnnotationGroup).toHaveBeenCalledWith({
        ...props.layer,
        title: props.modalOnSaveProps.newTitle,
        description: props.modalOnSaveProps.newDescription,
        tags: props.modalOnSaveProps.newTags,
      });

      expect(props.toasts.addError).toHaveBeenCalledTimes(1);

      expect(props.setState).not.toHaveBeenCalled();

      expect(props.toasts.addSuccess).not.toHaveBeenCalled();
    });
  });
});
