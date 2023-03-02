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
import { Flyout } from './save_action';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { EditDetailsFlyout } from './edit_details_action';
import { PointInTimeEventAnnotationConfig } from '@kbn/event-annotation-plugin/common';

describe('annotation group save action', () => {
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

  const getProps = () => ({
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
  });

  let props: ReturnType<typeof getProps>;
  beforeEach(() => {
    props = getProps();
  });

  test('successful initial save', async () => {
    const wrapper = shallowWithIntl(
      <Flyout {...props} domElement={document.createElement('div')} />
    );

    const newTitle = 'title';

    // ignore the linter, you need this await statement
    await wrapper.find(EditDetailsFlyout).prop('onConfirm')(newTitle);

    expect(props.eventAnnotationService.createAnnotationGroup).toHaveBeenCalledWith({
      ...props.layer,
      title: newTitle,
    });

    expect(props.setState.mock.calls).toMatchSnapshot();

    expect(props.toasts.addSuccess).toHaveBeenCalledTimes(1);
  });

  test('failed initial save', async () => {
    (props.eventAnnotationService.createAnnotationGroup as jest.Mock).mockRejectedValue(
      new Error('oh noooooo')
    );

    const wrapper = shallowWithIntl(
      <Flyout {...props} domElement={document.createElement('div')} />
    );

    const newTitle = 'title';

    // ignore the linter, you need this await statement
    await wrapper.find(EditDetailsFlyout).prop('onConfirm')(newTitle);

    expect(props.eventAnnotationService.createAnnotationGroup).toHaveBeenCalledWith({
      ...props.layer,
      title: newTitle,
    });

    expect(props.toasts.addError).toHaveBeenCalledTimes(1);

    expect(props.setState).not.toHaveBeenCalled();

    expect(props.toasts.addSuccess).not.toHaveBeenCalled();
  });
});
