/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import mockAnnotations from '../components/annotations/annotations_table/__mocks__/mock_annotations.json';

import { Annotation } from '../../../common/types/annotations';
import {
  annotationsRefresh$,
  annotationsRefreshed,
  AnnotationUpdatesService,
} from './annotations_service';
describe('annotations_service', () => {
  let annotationUpdatesService: AnnotationUpdatesService | null = null;

  beforeEach(() => {
    annotationUpdatesService = new AnnotationUpdatesService();
  });

  test('annotationUpdatesService', () => {
    const subscriber = jest.fn();

    annotationUpdatesService!.update$().subscribe(subscriber);

    // the subscriber should have been triggered with the initial value of null
    expect(subscriber.mock.calls).toHaveLength(1);
    expect(subscriber.mock.calls[0][0]).toBe(null);

    const annotation = mockAnnotations[0] as Annotation;
    annotationUpdatesService!.setValue(annotation);

    // the subscriber should have been triggered with the updated annotation value
    expect(subscriber.mock.calls).toHaveLength(2);
    expect(subscriber.mock.calls[1][0]).toEqual(annotation);
  });

  test('annotationsRefresh$', () => {
    const subscriber = jest.fn();

    annotationsRefresh$.subscribe(subscriber);

    expect(subscriber.mock.calls).toHaveLength(1);

    annotationsRefreshed();

    expect(subscriber.mock.calls).toHaveLength(2);
  });
});
