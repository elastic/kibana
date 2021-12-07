/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rasters } from './rasters.js';
import { cachedZonedDateTimeFrom, timeProp } from './chrono/cachedChrono.js';
import { axisModel } from './axisModel.js';
import { domainTween } from './domainTween.js';
import { renderCartesian } from './render/cartesian.js';
import { renderDebugBox } from './render/glyphs/debugBox.js';
import { renderTimeUnitAnnotation } from './render/annotations/timeUnit.js';
import { renderTimeExtentAnnotation } from './render/annotations/timeExtent.js';
import { renderChartTitle } from './render/annotations/chartTitle.js';
import { clamp, mix, unitClamp } from './utils/math.js';
import { axisScale, getDesiredTickCount } from './utils/projection.js';
import { observe, toCallbackFn } from './utils/generator.js';
import { elementSizes, zoomSafePointerX, zoomSafePointerY } from './utils/dom.js';

const eventBridge = [];

export function hookUp(id, { dataResponse: initialDataResponse, onChangeRange }) {
  const processAction = toCallbackFn(handleEvents());

  const initialDarkMode = true;
  const drawCartesianBox = false;

  const singleValuedMetricsAggregationFunctionNames = {
    sum: 'sum',
    min: 'minimum',
    max: 'maximum',
    avg: 'average',
    cardinality: 'cardinality',
    median_absolute_deviation: 'med abs dev',
    rate: 'rate',
    value_count: 'value count',
  };

  const aggregationFunctionNames = {
    ...singleValuedMetricsAggregationFunctionNames,
  };

  const metricFieldNames = ['machine.ram', 'bytes', 'memory'];

  const minZoom = 0;
  const maxZoom = 33;

  // these are hand tweaked constants that fulfill various design constraints, let's discuss before changing them
  const lineThicknessSteps = [
    /*0,*/ 0.5, 0.75, 1, 1, 1, 1.25, 1.25, 1.5, 1.5, 1.75, 1.75, 2, 2, 2, 2, 2,
  ];
  const lumaSteps = [/*255,*/ 192, 72, 32, 16, 8, 4, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0];

  const smallFontSize = 12;
  const timeZone = 'Europe/Zurich';

  const themeLight = {
    defaultFontColor: 'black',
    subduedFontColor: '#393939',
    offHourFontColor: 'black',
    weekendFontColor: 'darkred',
    backgroundColor: { r: 255, g: 255, b: 255 },
    lumaSteps,
  };

  const themeDark = {
    defaultFontColor: 'white',
    subduedFontColor: 'darkgrey',
    offHourFontColor: 'white',
    weekendFontColor: 'indianred',
    backgroundColor: { r: 0, g: 0, b: 0 },
    lumaSteps: lumaSteps.map((l) => 255 - l),
  };

  const config = {
    darkMode: false,
    sparse: false,
    implicit: false,
    maxLabelRowCount: 3, // can be 1, 2, 3
    queryConfig: {
      metricFieldName: metricFieldNames[0],
      aggregation: 'value_count',
      boxplot: false,
      window: 0,
      alpha: 0.4,
      beta: 0.2,
      gamma: 0.2,
      period: 1,
      multiplicative: false,
      binOffset: 0,
    },
    a11y: {
      shortcuts: true,
      contrast: 'medium',
      animation: true,
      sonification: false,
    },
    locale: 'en-US',
    numUnit: 'short',
    ...themeLight,
    barChroma: { r: 96, g: 146, b: 192 },
    barFillAlpha: 0.3,
    lineThicknessSteps,
    domainFrom: initialDataResponse.stats.minEpochMs / 1000,
    domainTo: initialDataResponse.stats.maxEpochMs / 1000,
    minBinWidth: 'minute',
    maxBinWidth: 'year',
    pixelRangeFrom: 100,
    pixelRangeTo: 500,
    tickLabelMaxProtrusionLeft: 0, // constraining not used yet
    tickLabelMaxProtrusionRight: 0, // constraining not used yet
    protrudeAxisLeft: true, // constraining not used yet
    protrudeAxisRight: true, // constraining not used yet
    smallFontSize,
    cssFontShorthand: `normal normal 100 ${smallFontSize}px Inter, Helvetica, Arial, sans-serif`,
    monospacedFontShorthand: `normal normal 100 ${smallFontSize}px "Roboto Mono", Consolas, Menlo, Courier, monospace`,
    rowPixelPitch: 16,
    horizontalPixelOffset: 4,
    verticalPixelOffset: 6,
    minimumTickPixelDistance: 24,
    workHourMin: 6,
    workHourMax: 21,
    clipLeft: true,
    clipRight: true,
  };

  const canvas = document.getElementById('canvas' + id);
  const ctx = canvas.getContext('2d', {
    /* alpha: true */
  });
  const dpi = 1;

  const horizontalCartesianAreaPad = [0.05, 0];
  const verticalCartesianAreaPad = [0.12, 0.25];

  const interactionState = {
    // current zoom and pan level
    zoom: 1,
    pan: 1,

    // remembering touch points for zoom/pam
    multitouch: [],

    // zoom/pan
    dragStartX: NaN,
    zoomStart: NaN,
    panStart: NaN,

    // kinetic pan
    lastDragX: NaN,
    dragVelocity: NaN,
    flyVelocity: NaN,

    // Y domain
    niceDomainMin: NaN,
    niceDomainMax: NaN,

    // other
    screenDimensions: elementSizes(canvas, horizontalCartesianAreaPad, verticalCartesianAreaPad),
    searchText: '',
  };

  const localeOptions = {
    hour12: false,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  };

  const dataState = {
    valid: false,
    pending: false,
    lo: { year: Infinity, month: 12, day: 31, hour: 23, minute: 59, second: 59 },
    hi: { year: -Infinity, month: 1, day: 1, hour: 0, minute: 0, second: 0 },
    binUnit: '',
    binUnitCount: NaN,
    queryConfig: {},
    dataResponse: initialDataResponse,
  };

  const panOngoing = (interactionState) => Number.isFinite(interactionState.dragStartX);

  // todo this may need an update with locale change
  const defaultLabelFormat = new Intl.DateTimeFormat(config.locale, {
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    timeZone,
  }).format;

  // todo this may need an update with locale change
  const defaultMinorTickLabelFormat = new Intl.DateTimeFormat(config.locale, {
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    timeZone,
  }).format;

  let rasterSelector;
  const generateRasters = () => (rasterSelector = rasters(config, timeZone));
  generateRasters();

  const fadeOutPixelWidth = 12; // todo add to config

  const invalid = (dataDemand) => {
    return (
      !dataState.valid ||
      dataState.binUnit !== dataDemand.binUnit ||
      dataState.binUnitCount !== dataDemand.binUnitCount ||
      dataDemand.lo.timePointSec < dataState.lo.timePointSec ||
      dataDemand.hi.timePointSec > dataState.hi.timePointSec
    );
  };

  const updateDataState = (dataDemand, config, dataResponse, interactionState) => {
    dataState.pending = false;
    dataState.valid = true;
    dataState.lo = dataDemand.lo;
    dataState.hi = dataDemand.hi;
    dataState.binUnit = dataDemand.binUnit;
    dataState.binUnitCount = dataDemand.binUnitCount;
    dataState.queryConfig = JSON.stringify(config.queryConfig);
    dataState.dataResponse = dataResponse;
    dataState.searchText = interactionState.searchText;
  };

  const yTickNumberFormatter = new Intl.NumberFormat(
    config.locale,
    config.numUnit === 'none'
      ? {}
      : {
          notation: 'compact',
          compactDisplay: config.numUnit,
        }
  );

  // constants for Y
  const ZERO_Y_BASE = true;

  const emWidth = ctx.measureText('mmmmmmmmmm').width / 10; // approx width to avoid too many measurements

  let canvasWidth = NaN;
  let canvasHeight = NaN;

  const fromSec = config.domainFrom;
  const toSec = config.domainTo;
  const fullTimeExtent = toSec - fromSec;

  const zoomMultiplier = () => 2 ** interactionState.zoom;

  let rAF = -1;
  let prevT = 0;

  const timedRender = (t) => {
    const deltaT = t - prevT;
    prevT = t;
    chartWithTime(ctx, config, interactionState, deltaT);
  };

  function scheduleChartRender() {
    window.cancelAnimationFrame(rAF);
    rAF = window.requestAnimationFrame(timedRender);
  }

  function doCartesian(
    ctx,
    cartesianHeight,
    config,
    interactionState,
    deltaT,
    cartesianWidth,
    timeDomainFrom,
    timeDomainTo
  ) {
    ctx.save();
    ctx.translate(0, cartesianHeight);

    const domainLandmarks = [
      dataState.dataResponse.stats.minSum,
      dataState.dataResponse.stats.maxSum,
      ...(ZERO_Y_BASE ? [0] : []),
    ];
    const desiredTickCount = getDesiredTickCount(
      cartesianHeight,
      config.smallFontSize,
      config.sparse
    );
    const { niceDomainMin, niceDomainMax, niceTicks } = axisModel(
      domainLandmarks,
      desiredTickCount
    );
    const yTweenOngoing = domainTween(interactionState, deltaT, niceDomainMin, niceDomainMax); // updates interactionState
    const yUnitScale = axisScale(interactionState.niceDomainMin, interactionState.niceDomainMax);
    const yUnitScaleClamped = (d) => unitClamp(yUnitScale(d));

    const dataDemand = renderCartesian(
      ctx,
      config,
      dataState,
      config,
      defaultMinorTickLabelFormat,
      emWidth,
      fadeOutPixelWidth,
      defaultLabelFormat,
      yTickNumberFormatter,
      rasterSelector,
      cartesianWidth,
      cartesianHeight,
      {
        domainFrom: timeDomainFrom,
        domainTo: timeDomainTo,
      },
      yUnitScale,
      yUnitScaleClamped,
      niceTicks
    );

    ctx.restore();

    return { yTweenOngoing, dataDemand };
  }

  function getTimeDomain() {
    const pan = interactionState.pan;
    const zoomedTimeExtent = fullTimeExtent / zoomMultiplier();
    const leeway = fullTimeExtent - zoomedTimeExtent;
    const timeDomainFrom = fromSec + pan * leeway;
    const timeDomainTo = toSec - (1 - pan) * leeway;
    return { timeDomainFrom, timeDomainTo };
  }

  function ensureCanvasElementSize(newCanvasWidth, newCanvasHeight) {
    if (newCanvasWidth !== canvasWidth) {
      canvas.setAttribute('width', String(newCanvasWidth));
      canvasWidth = newCanvasWidth;
    }
    if (newCanvasHeight !== canvasHeight) {
      canvas.setAttribute('height', String(newCanvasHeight));
      canvasHeight = newCanvasHeight;
    }
  }

  function renderChartWithTime(
    ctx,
    backgroundFillStyle,
    newCanvasWidth,
    newCanvasHeight,
    config,
    chartWidth,
    cartesianTop,
    aggregationFunctionName,
    cartesianLeft,
    cartesianHeight,
    interactionState,
    deltaT,
    cartesianWidth,
    timeDomainFrom,
    timeDomainTo,
    drawCartesianBox,
    chartTopFontSize
  ) {
    ctx.save();
    ctx.scale(dpi, dpi);
    ctx.fillStyle = backgroundFillStyle;
    // clearRect is not enough, as browser image copy ignores canvas background color
    ctx.fillRect(0, 0, newCanvasWidth, newCanvasHeight);

    // chart title

    ctx.translate(cartesianLeft, cartesianTop);

    // cartesian
    const { yTweenOngoing, dataDemand } = doCartesian(
      ctx,
      cartesianHeight,
      config,
      interactionState,
      deltaT,
      cartesianWidth,
      timeDomainFrom,
      timeDomainTo
    );

    // cartesian area box
    if (drawCartesianBox) {
      renderDebugBox(ctx, cartesianWidth, cartesianHeight);
    }

    // chart time unit info
    renderTimeUnitAnnotation(
      ctx,
      config,
      dataDemand.binUnitCount,
      dataDemand.binUnit,
      chartTopFontSize,
      dataDemand.unitBarMaxWidthPixels
    );

    // chart time from/to extent info
    renderTimeExtentAnnotation(
      ctx,
      config,
      localeOptions,
      timeDomainFrom,
      timeDomainTo,
      cartesianWidth,
      chartTopFontSize
    );

    ctx.restore();
    return { yTweenOngoing, dataDemand };
  }

  let lastDataDemand;

  const dataArrived = (dataDemand, dataResponse) => {
    updateDataState(dataDemand, config, dataResponse, interactionState);
    scheduleChartRender();
  };

  function chartWithTime(ctx, config, interactionState, deltaT) {
    const {
      outerWidth: chartWidth,
      outerHeight: chartHeight,
      innerLeft: cartesianLeft,
      innerWidth: cartesianWidth,
      innerTop: cartesianTop,
      innerHeight: cartesianHeight,
    } = interactionState.screenDimensions;

    const { timeDomainFrom, timeDomainTo } = getTimeDomain();

    const qc = config.queryConfig;
    const aggregationFunctionName = aggregationFunctionNames[qc.aggregation];
    const chartTopFontSize = config.smallFontSize + 2; // todo move to config
    const backgroundFillStyle = `rgba(${config.backgroundColor.r},${config.backgroundColor.g},${config.backgroundColor.b},1)`;

    // resize if needed
    const newCanvasWidth = dpi * chartWidth;
    const newCanvasHeight = dpi * chartHeight;
    ensureCanvasElementSize(newCanvasWidth, newCanvasHeight);

    // render chart
    const { yTweenOngoing, dataDemand } = renderChartWithTime(
      ctx,
      backgroundFillStyle,
      newCanvasWidth,
      newCanvasHeight,
      config,
      chartWidth,
      cartesianTop,
      aggregationFunctionName,
      cartesianLeft,
      cartesianHeight,
      interactionState,
      deltaT,
      cartesianWidth,
      timeDomainFrom,
      timeDomainTo,
      drawCartesianBox,
      chartTopFontSize
    );
    lastDataDemand = dataDemand;

    onChangeRange(dataDemand);
    if (
      !dataState.pending &&
      invalid(dataDemand) &&
      dataDemand.lo &&
      dataDemand.hi &&
      dataDemand.binUnit &&
      dataDemand.binUnitCount
    ) {
      dataState.pending = true;
    } else if (yTweenOngoing) {
      scheduleChartRender();
    }
  }

  const setDomElements = () => {
    const chartSizeInfo = elementSizes(
      canvas,
      horizontalCartesianAreaPad,
      verticalCartesianAreaPad
    );
    interactionState.screenDimensions = chartSizeInfo;
  };

  const fullRender = () => {
    setDomElements();
    scheduleChartRender();
  };

  fullRender();

  /**
   * event listener utils
   */

  const getPanDeltaPerDragPixel = () =>
    1 / ((zoomMultiplier() - 1) * interactionState.screenDimensions.innerWidth);

  const panFromDeltaPixel = (panStart, delta) => {
    const panDeltaPerDragPixel = getPanDeltaPerDragPixel();
    interactionState.pan = Math.max(0, Math.min(1, panStart - panDeltaPerDragPixel * delta)) || 0;
  };

  const inCartesianBand = (e) => {
    const y = zoomSafePointerY(e);
    const { innerTop: cartesianTop, innerBottom: cartesianBottom } =
      interactionState.screenDimensions;
    return cartesianTop <= y && y <= cartesianBottom;
  };

  const inCartesianArea = (e) => {
    const x = zoomSafePointerX(e);
    const y = zoomSafePointerY(e);
    const { innerTop, innerBottom, innerLeft, innerRight } = interactionState.screenDimensions;
    return innerLeft <= x && x <= innerRight && innerTop <= y && y <= innerBottom;
  };

  /**
   * event handlers
   */

  const zoom = (pointerUnitLocation, newZoom, panDelta = 0) => {
    const oldInvisibleFraction = 1 - 1 / zoomMultiplier();
    interactionState.zoom = clamp(newZoom, minZoom, maxZoom);
    const newInvisibleFraction = 1 - 1 / zoomMultiplier();
    interactionState.pan =
      unitClamp(
        mix(
          pointerUnitLocation + panDelta,
          interactionState.pan,
          oldInvisibleFraction / newInvisibleFraction
        )
      ) || 0;
  };

  const zoomAroundX = (centerX, newZoom, panDelta = 0) => {
    const { innerWidth: cartesianWidth, innerLeft: cartesianLeft } =
      interactionState.screenDimensions;
    const unitZoomCenter =
      Math.max(0, Math.min(cartesianWidth, centerX - cartesianLeft)) / cartesianWidth;
    zoom(unitZoomCenter, newZoom, panDelta);
  };

  const pan = (normalizedDeltaPan) => {
    const deltaPan = normalizedDeltaPan / 2 ** interactionState.zoom;
    interactionState.pan = unitClamp(interactionState.pan + deltaPan) || 0;
  };

  // these two change together: the kinetic friction deceleration from a click drag, and from a wheel drag should match
  // currently, the narrower the chart, the higher the deceleration, which is perhaps better than width invariant slowing
  const dragVelocityAttenuation = 0.92;
  const wheelPanVelocityDivisor = 1000;

  const wheelZoomVelocityDivisor = 250;
  const keyZoomVelocityDivisor = 2; // 1 means, on each up/down keypress, double/halve the visible time domain
  const keyPanVelocityDivisor = 10; // 1 means, on each left/right keypress, move the whole of current visible time domain

  const wheel = (e) => {
    if (!inCartesianBand(e)) return;

    if (e.metaKey) {
      pan(-e.deltaY / wheelPanVelocityDivisor);
    } else {
      const centerX = zoomSafePointerX(e);
      const newZoom = interactionState.zoom - e.deltaY / wheelZoomVelocityDivisor;
      zoomAroundX(centerX, newZoom);
    }

    scheduleChartRender();
  };

  const dragStartAtX = (startingX) => {
    interactionState.dragStartX = startingX;
    interactionState.lastDragX = startingX;
    interactionState.dragVelocity = NaN;
    interactionState.flyVelocity = NaN;
    interactionState.panStart = interactionState.pan;
  };

  const dragStart = (e) => dragStartAtX(zoomSafePointerX(e));

  const kineticDragHandler = (t) => {
    const velocity = interactionState.flyVelocity;
    if (Math.abs(velocity) > 0.01) {
      panFromDeltaPixel(interactionState.pan, velocity);
      interactionState.flyVelocity *= dragVelocityAttenuation;
      timedRender(t);
      window.requestAnimationFrame(kineticDragHandler);
    } else {
      interactionState.flyVelocity = NaN;
    }
  };

  const dragEnd = () => {
    interactionState.flyVelocity = interactionState.dragVelocity;
    interactionState.dragVelocity = NaN;
    interactionState.dragStartX = NaN;
    interactionState.panStart = NaN;
    window.requestAnimationFrame(kineticDragHandler);
  };

  const panFromX = (currentX) => {
    const deltaX = currentX - interactionState.lastDragX;
    const dragVelocity = interactionState.dragVelocity;
    interactionState.dragVelocity =
      deltaX * dragVelocity > 0 && Math.abs(deltaX) < Math.abs(dragVelocity)
        ? dragVelocity // mix(dragVelocity, deltaX, 0.04)
        : deltaX;
    interactionState.lastDragX = currentX;
    const delta = currentX - interactionState.dragStartX;
    panFromDeltaPixel(interactionState.panStart, delta);
    return delta;
  };

  const touchMidpoint = (multitouch) => (multitouch[0].x + multitouch[1].x) / 2;

  const touchmove = (e) => {
    const multitouch = [...(e.touches ?? [])]
      .map((t) => ({
        id: t.identifier,
        x: zoomSafePointerX(t),
      }))
      .sort(({ x: a }, { x: b }) => a - b);

    if (interactionState.multitouch.length === 0 && multitouch.length === 2) {
      interactionState.multitouch = multitouch;
      interactionState.zoomStart = interactionState.zoom;
      const centerX = touchMidpoint(multitouch);
      dragStartAtX(centerX);
    } else if (
      multitouch.length !== 2 ||
      [...multitouch, ...interactionState.multitouch].filter(
        (t, i, a) => a.findIndex((tt) => tt.id === t.id) === i
      ).length !== 2
    ) {
      interactionState.multitouch = [];
      interactionState.zoomStart = NaN;
      /*
        interactionState.dragStartX = NaN
        interactionState.lastDragX = NaN
        // interactionState.dragVelocity = NaN
        // interactionState.flyVelocity = NaN
        interactionState.panStart = NaN
    */
    }
    if (interactionState.multitouch.length === 2) {
      const centerX = touchMidpoint(multitouch);
      const zoomMultiplier =
        (multitouch[1].x - multitouch[0].x) /
        (interactionState.multitouch[1].x - interactionState.multitouch[0].x);
      const panDelta = 0; // panFromX(centerX)
      zoomAroundX(centerX, interactionState.zoomStart + Math.log2(zoomMultiplier), panDelta);
      scheduleChartRender();
    } else if (inCartesianArea(e) || Number.isFinite(interactionState.panStart)) {
      if (!panOngoing(interactionState)) {
        dragStart(e);
      } else {
        const currentX = zoomSafePointerX(e);
        panFromX(currentX);
        scheduleChartRender();
      }
    }
  };

  const touchstart = (e) => inCartesianArea(e) && dragStart(e);
  const touchend = dragEnd;
  const mousedown = touchstart;
  const mousemove = (e) => e.buttons === 1 && touchmove(e);
  const mouseup = touchend;
  const touchcancel = touchend;

  const chartKeydown = (e) => {
    const panDirection = { ArrowLeft: -1, ArrowRight: 1 }[e.code];
    const zoomDirection = { ArrowUp: -1, ArrowDown: 1 }[e.code];
    if (panDirection || zoomDirection) {
      if (panDirection) pan(panDirection / keyPanVelocityDivisor);
      if (zoomDirection) zoom(0.5, interactionState.zoom + zoomDirection / keyZoomVelocityDivisor);
      e.preventDefault(); // preventDefault needed because otherwise a right arrow key takes the user to the next element
      scheduleChartRender();
    }
  };

  const resize = () => fullRender();

  /**
   * attaching event handlers
   */

  const eventHandlersForWindow = { resize };
  const eventHandlersForCanvas = {
    wheel,
    mousemove,
    mousedown,
    mouseup,
    touchmove,
    touchstart,
    touchend,
    touchcancel,
    keydown: chartKeydown,
  };

  const eventHandlers = new Map([['CANVAS', eventHandlersForCanvas]]);

  function* handleEvents() {
    for (;;) {
      const e = yield;
      eventBridge.forEach((someEventHandlers) => {
        const handler = someEventHandlers.get(e.target.tagName)[e.type];
        if (handler) handler(e);
      });
    }
  }

  // observe(window, processAction, eventHandlersForWindow);
  observe(canvas, processAction, eventHandlersForCanvas);
  eventBridge.push(eventHandlers);

  chartWithTime(ctx, config, interactionState, 0);
  return {
    dataArrived: (data) => dataArrived(lastDataDemand, data),
    unmount: () => {
      eventBridge.splice(eventBridge.indexOf(eventHandlers), 1);
    },
  };
}
