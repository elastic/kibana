/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Mock config
 */

const adHocGroupName = 'adHocGroup';
const alignmentGuideName = 'alignmentGuide';
const atopZ = 1000;
const depthSelect = true;
const devColor = 'magenta';
const groupName = 'group';
const groupResize = true;
const guideDistance = 3;
const hoverAnnotationName = 'hoverAnnotation';
const hoverLift = 100;
const intraGroupManipulation = false;
const intraGroupSnapOnly = false;
const persistentGroupName = 'persistentGroup';
const resizeAnnotationOffset = 0;
const resizeAnnotationOffsetZ = 0.1; // causes resize markers to be slightly above the shape plane
const resizeAnnotationSize = 10;
const resizeAnnotationConnectorOffset = 0; //resizeAnnotationSize //+ 2
const resizeConnectorName = 'resizeConnector';
const rotateAnnotationOffset = 12;
const rotationEpsilon = 0.001;
const rotationHandleName = 'rotationHandle';
const rotationHandleSize = 14;
const resizeHandleName = 'resizeHandle';
const rotateSnapInPixels = 10;
const shortcuts = false;
const singleSelect = false;
const snapConstraint = true;
const minimumElementSize = 0; // guideDistance / 2 + 1;

module.exports = {
  adHocGroupName,
  alignmentGuideName,
  atopZ,
  depthSelect,
  devColor,
  groupName,
  groupResize,
  guideDistance,
  hoverAnnotationName,
  hoverLift,
  intraGroupManipulation,
  intraGroupSnapOnly,
  minimumElementSize,
  persistentGroupName,
  resizeAnnotationOffset,
  resizeAnnotationOffsetZ,
  resizeAnnotationSize,
  resizeAnnotationConnectorOffset,
  resizeConnectorName,
  resizeHandleName,
  rotateAnnotationOffset,
  rotationEpsilon,
  rotateSnapInPixels,
  rotationHandleName,
  rotationHandleSize,
  shortcuts,
  singleSelect,
  snapConstraint,
};
