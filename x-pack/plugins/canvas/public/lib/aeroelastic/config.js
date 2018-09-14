/**
 * Mock config
 */

const alignmentGuideName = 'alignmentGuide';
const atopZ = 1000;
const depthSelect = true;
const devColor = 'magenta';
const guideDistance = 3;
const hoverAnnotationName = 'hoverAnnotation';
const resizeAnnotationOffset = 0;
const resizeAnnotationOffsetZ = 0.1; // causes resize markers to be slightly above the shape plane
const resizeAnnotationSize = 10;
const resizeAnnotationConnectorOffset = 0; //resizeAnnotationSize //+ 2
const resizeConnectorName = 'resizeConnector';
const rotateAnnotationOffset = 12;
const rotationHandleName = 'rotationHandle';
const rotationHandleSize = 14;
const resizeHandleName = 'resizeHandle';
const rotateSnapInPixels = 10;
const shortcuts = false;
const singleSelect = true;
const snapConstraint = true;
const minimumElementSize = 0; // guideDistance / 2 + 1;

module.exports = {
  alignmentGuideName,
  atopZ,
  depthSelect,
  devColor,
  guideDistance,
  hoverAnnotationName,
  minimumElementSize,
  resizeAnnotationOffset,
  resizeAnnotationOffsetZ,
  resizeAnnotationSize,
  resizeAnnotationConnectorOffset,
  resizeConnectorName,
  resizeHandleName,
  rotateAnnotationOffset,
  rotateSnapInPixels,
  rotationHandleName,
  rotationHandleSize,
  shortcuts,
  singleSelect,
  snapConstraint,
};
