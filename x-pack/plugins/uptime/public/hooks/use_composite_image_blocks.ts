/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { createAction } from 'redux-actions';
import { useFetcher } from 'x-pack/plugins/observability/public';
import { ScreenshotRefImageData } from '../../common/runtime_types';
import { fetchScreenshotBlock } from '../state/api/journey';

const getBlocks = createAction<string[]>('GET_SCREENSHOT_BLOCKS');

export const useCompositeImageBlocks = (imgRef: ScreenshotRefImageData) => {
  const {
    ref: {
      screenshotRef: {
        screenshot_ref: { blocks },
      },
    },
  } = imgRef;
  const { data, status } = useFetcher(() => {
    return fetchScreenshotBlock(blocks.map(({ hash }) => hash));
  }, [blocks]);
  // const dispatch = useDispatch();
  // const {
  //   ref: {
  //     screenshotRef: {
  //       screenshot_ref: { blocks },
  //     },
  //   },
  // } = imgRef;
  // useEffect(() => {
  //   dispatch(getBlocks(blocks.map(({ hash }) => hash)));
  // }, [dispatch, blocks]);
};
