/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC, useContext, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import useObservable from 'react-use/lib/useObservable';
import { LAUNCHED_FULLSCREEN, LAUNCHED_FULLSCREEN_AUTOPLAY } from '../../../common/lib/constants';
import { State } from '../../../types';
import { useZoomHandlers } from '../../lib/app_handler_creators';
// @ts-expect-error
import { transitionsRegistry } from '../../lib/transitions_registry';
import { METRIC_TYPE, trackCanvasUiMetric } from '../../lib/ui_metric';
import { WorkpadRoutingContext } from '../../routes/workpad';
import { usePlatformService } from '../../services';
// @ts-expect-error
import { fetchAllRenderables as fetchAllRenderablesAction } from '../../state/actions/elements';
// @ts-expect-error
import { setZoomScale as setZoomScaleAction } from '../../state/actions/transient';
import { getFullscreen, getZoomScale } from '../../state/selectors/app';
import {
  getAllElements,
  getPages,
  getSelectedPageIndex,
  getWorkpad,
} from '../../state/selectors/workpad';
import { useIncomingEmbeddable } from '../hooks';
import { Props, Workpad as WorkpadComponent } from './workpad.component';

type ContainerProps = Pick<Props, 'registerLayout' | 'unregisterLayout'>;

export const Workpad: FC<ContainerProps> = (props) => {
  const dispatch = useDispatch();
  const [grid, setGrid] = useState<boolean>(false);
  const [transition, setTransition] = useState<any | null>(null);
  const [prevSelectedPageNumber] = useState<number>(0);

  const { isFullscreen, setFullscreen, undo, redo, autoplayInterval, nextPage, previousPage } =
    useContext(WorkpadRoutingContext);

  const platformService = usePlatformService();

  const hasHeaderBanner = useObservable(platformService.hasHeaderBanner$());

  const propsFromState = useSelector((state: State) => {
    const { width, height, id: workpadId, css: workpadCss } = getWorkpad(state);
    return {
      pages: getPages(state),
      selectedPageNumber: getSelectedPageIndex(state) + 1,
      totalElementCount: getAllElements(state).length,
      width,
      height,
      workpadCss,
      workpadId,
      isFullscreen: getFullscreen(state),
      zoomScale: getZoomScale(state),
    };
  });

  const selectedPage = propsFromState.pages[propsFromState.selectedPageNumber - 1];
  useIncomingEmbeddable(selectedPage);

  const fetchAllRenderables = useCallback(() => {
    dispatch(fetchAllRenderablesAction());
  }, [dispatch]);

  const setZoomScale = useCallback(
    (scale: number) => {
      dispatch(setZoomScaleAction(scale));
    },
    [dispatch]
  );

  const getAnimation = useCallback(
    (pageNumber) => {
      if (!transition || !transition.name) {
        return null;
      }
      if (![propsFromState.selectedPageNumber, prevSelectedPageNumber].includes(pageNumber)) {
        return null;
      }
      const { enter, exit } = transitionsRegistry.get(transition.name);
      const laterPageNumber = Math.max(propsFromState.selectedPageNumber, prevSelectedPageNumber);
      const name = pageNumber === laterPageNumber ? enter : exit;
      const direction =
        prevSelectedPageNumber > propsFromState.selectedPageNumber ? 'reverse' : 'normal';
      return { name, direction };
    },
    [propsFromState.selectedPageNumber, transition, prevSelectedPageNumber]
  );

  const onTransitionEnd = useCallback(() => setTransition(null), [setTransition]);

  const setFullscreenWithEffect = useCallback(
    (fullscreen) => {
      setFullscreen(fullscreen);
      if (fullscreen === true) {
        trackCanvasUiMetric(
          METRIC_TYPE.COUNT,
          autoplayInterval > 0
            ? [LAUNCHED_FULLSCREEN, LAUNCHED_FULLSCREEN_AUTOPLAY]
            : LAUNCHED_FULLSCREEN
        );
      }
    },
    [setFullscreen, autoplayInterval]
  );

  const zoomHandlers = useZoomHandlers({ setZoomScale, zoomScale: propsFromState.zoomScale });

  return (
    <WorkpadComponent
      {...props}
      {...propsFromState}
      setFullscreen={setFullscreenWithEffect}
      isFullscreen={isFullscreen}
      undoHistory={undo}
      redoHistory={redo}
      hasHeaderBanner={hasHeaderBanner}
      grid={grid}
      setGrid={setGrid}
      nextPage={nextPage}
      previousPage={previousPage}
      fetchAllRenderables={fetchAllRenderables}
      getAnimation={getAnimation}
      onTransitionEnd={onTransitionEnd}
      {...zoomHandlers}
    />
  );
};
