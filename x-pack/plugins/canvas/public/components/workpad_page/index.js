/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { compose, shallowEqual, withState, withProps, withHandlers } from 'recompose';
import { notify } from '../../lib/notify';
import { setClipboardData, getClipboardData } from '../../lib/clipboard';
import { cloneSubgraphs } from '../../lib/clone_subgraphs';
import {
  removeElements,
  insertNodes,
  elementLayer,
  addElement,
  setMultiplePositions,
} from '../../state/actions/elements';
import { getFullscreen, canUserWrite } from '../../state/selectors/app';
import { getNodes, isWriteable } from '../../state/selectors/workpad';
import { arrayToMap, flatten, identity } from '../../lib/aeroelastic/functional';
import { nextScene } from '../../lib/aeroelastic/layout';
import { invert, matrixToAngle, multiply, rotateZ, translate } from '../../lib/aeroelastic/matrix';
import { eventHandlers } from './event_handlers';
import { WorkpadPage as Component } from './workpad_page';
import { selectElement } from './../../state/actions/transient';

const makeUid = () => 1e11 + Math.floor((1e12 - 1e11) * Math.random());

const aeroelasticConfiguration = {
  getAdHocChildAnnotationName: 'adHocChildAnnotation',
  adHocGroupName: 'adHocGroup',
  alignmentGuideName: 'alignmentGuide',
  atopZ: 1000,
  depthSelect: true,
  devColor: 'magenta',
  dragBoxAnnotationName: 'dragBoxAnnotation',
  dragBoxZ: 1050, // above alignment guides but below the upcoming hover tooltip
  groupName: 'group',
  groupResize: true,
  guideDistance: 3,
  hoverAnnotationName: 'hoverAnnotation',
  hoverLift: 100,
  intraGroupManipulation: false,
  intraGroupSnapOnly: false,
  minimumElementSize: 0,
  persistentGroupName: 'persistentGroup',
  resizeAnnotationConnectorOffset: 0,
  resizeAnnotationOffset: 0,
  resizeAnnotationOffsetZ: 0.1, // causes resize markers to be slightly above the shape plane
  resizeAnnotationSize: 10,
  resizeConnectorName: 'resizeConnector',
  resizeHandleName: 'resizeHandle',
  rotateAnnotationOffset: 12,
  rotateSnapInPixels: 10,
  rotationEpsilon: 0.001,
  rotationHandleName: 'rotationHandle',
  rotationHandleSize: 14,
  rotationTooltipName: 'rotationTooltip',
  shortcuts: false,
  singleSelect: false,
  snapConstraint: true,
  tooltipZ: 1100,
};

const mapStateToProps = (state, ownProps) => {
  return {
    isEditable: !getFullscreen(state) && isWriteable(state) && canUserWrite(state),
    elements: getNodes(state, ownProps.page.id),
  };
};

const mapDispatchToProps = dispatch => {
  return {
    insertNodes: pageId => selectedElements => dispatch(insertNodes(selectedElements, pageId)),
    removeElements: pageId => elementIds => dispatch(removeElements(elementIds, pageId)),
    addElement: pageId => element => dispatch(addElement(pageId, element)),
    setMultiplePositions: positions => dispatch(setMultiplePositions(positions)),
    selectElement: selectedElement => dispatch(selectElement(selectedElement)),
    // TODO: Abstract this out. This is the same code as in sidebar/index.js
    elementLayer: (pageId, selectedElement, movement) => {
      dispatch(
        elementLayer({
          pageId,
          elementId: selectedElement.id,
          movement,
        })
      );
    },
  };
};

const getRootElementId = (lookup, id) => {
  if (!lookup.has(id)) {
    return null;
  }

  const element = lookup.get(id);
  return element.parent && element.parent.subtype !== 'adHocGroup'
    ? getRootElementId(lookup, element.parent)
    : element.id;
};

// check for duplication
const deduped = a => a.filter((d, i) => a.indexOf(d) === i);
const idDuplicateCheck = groups => {
  if (deduped(groups.map(g => g.id)).length !== groups.length) {
    throw new Error('Duplicate element encountered');
  }
};

const missingParentCheck = groups => {
  const idMap = arrayToMap(groups.map(g => g.id));
  groups.forEach(g => {
    if (g.parent && !idMap[g.parent]) {
      g.parent = null;
    }
  });
};

/**
 * elementToShape
 *
 * converts a `kibana-canvas` element to an `aeroelastic` shape.
 *
 * Shape: the layout algorithms need to deal with objects through their geometric properties, excluding other aspects,
 * such as what's inside the element, eg. image or scatter plot. This representation is, at its core, a transform matrix
 * that establishes a new local coordinate system https://drafts.csswg.org/css-transforms/#local-coordinate-system plus a
 * size descriptor. There are two versions of the transform matrix:
 *   - `transformMatrix` is analogous to the SVG https://drafts.csswg.org/css-transforms/#current-transformation-matrix
 *   - `localTransformMatrix` is analogous to the SVG https://drafts.csswg.org/css-transforms/#transformation-matrix
 *
 * Element: it also needs to represent the geometry, primarily because of the need to persist it in `redux` and on the
 * server, and to accept such data from the server. The redux and server representations will need to change as more general
 * projections such as 3D are added. The element also needs to maintain its content, such as an image or a plot.
 *
 * While all elements on the current page also exist as shapes, there are shapes that are not elements: annotations.
 * For example, `rotation_handle`, `border_resize_handle` and `border_connection` are modeled as shapes by the layout
 * library, simply for generality.
 */
const elementToShape = (element, i) => {
  const position = element.position;
  const a = position.width / 2;
  const b = position.height / 2;
  const cx = position.left + a;
  const cy = position.top + b;
  const z = i; // painter's algo: latest item goes to top
  // multiplying the angle with -1 as `transform: matrix3d` uses a left-handed coordinate system
  const angleRadians = (-position.angle / 180) * Math.PI;
  const transformMatrix = multiply(translate(cx, cy, z), rotateZ(angleRadians));
  const isGroup = element.id.startsWith('group');
  const parent = (element.position && element.position.parent) || null; // reserved for hierarchical (tree shaped) grouping
  return {
    id: element.id,
    type: isGroup ? 'group' : 'rectangleElement',
    subtype: isGroup ? 'persistentGroup' : '',
    parent,
    transformMatrix,
    a, // we currently specify half-width, half-height as it leads to
    b, // more regular math (like ellipsis radii rather than diameters)
  };
};

const shapeToElement = shape => {
  let angle = Math.round((matrixToAngle(shape.transformMatrix) * 180) / Math.PI);
  if (1 / angle === -Infinity) {
    angle = 0;
  }
  return {
    left: shape.transformMatrix[12] - shape.a,
    top: shape.transformMatrix[13] - shape.b,
    width: shape.a * 2,
    height: shape.b * 2,
    angle,
    parent: shape.parent || null,
    type: shape.type === 'group' ? 'group' : 'element',
  };
};

const updateGlobalPositions = (setPositions, { shapes, gestureEnd }, unsortedElements) => {
  const ascending = (a, b) => (a.id < b.id ? -1 : 1);
  const relevant = s => s.type !== 'annotation' && s.subtype !== 'adHocGroup';
  const elements = unsortedElements.filter(relevant).sort(ascending);
  const repositionings = shapes
    .filter(relevant)
    .sort(ascending)
    .map((shape, i) => {
      const element = elements[i];
      const elemPos = element && element.position;
      if (elemPos && gestureEnd) {
        // get existing position information from element
        const oldProps = {
          left: elemPos.left,
          top: elemPos.top,
          width: elemPos.width,
          height: elemPos.height,
          angle: Math.round(elemPos.angle),
          type: elemPos.type,
          parent: elemPos.parent || null,
        };

        // cast shape into element-like object to compare
        const newProps = shapeToElement(shape);

        if (1 / newProps.angle === -Infinity) {
          newProps.angle = 0;
        } // recompose.shallowEqual discerns between 0 and -0

        const result = shallowEqual(oldProps, newProps)
          ? null
          : { position: newProps, elementId: shape.id };
        return result;
      }
    })
    .filter(identity);
  if (repositionings.length) {
    setPositions(repositionings);
  }
};

export const WorkpadPage = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  withProps(({ isSelected, animation }) => {
    function getClassName() {
      if (animation) {
        return animation.name;
      }
      return isSelected ? 'canvasPage--isActive' : 'canvasPage--isInactive';
    }

    function getAnimationStyle() {
      if (!animation) {
        return {};
      }
      return {
        animationDirection: animation.direction,
        // TODO: Make this configurable
        animationDuration: '1s',
      };
    }

    return {
      className: getClassName(),
      animationStyle: getAnimationStyle(),
    };
  }),
  withState('aeroelastic', 'setAeroelastic', props => {
    const shapes = props.elements
      .map(elementToShape)
      .filter((d, i, a) => !d.id.startsWith('group') || a.find(s => s.parent === d.id));
    // todo delete these
    idDuplicateCheck(shapes);
    missingParentCheck(shapes);
    shapes.forEach(shape => {
      shape.localTransformMatrix = shape.parent
        ? multiply(
            invert(shapes.find(s => s.id === shape.parent).transformMatrix),
            shape.transformMatrix
          )
        : shape.transformMatrix;
    });
    // todo move this initial state in a file under `aeroelastic/`
    return {
      primaryUpdate: null,
      currentScene: { shapes, configuration: aeroelasticConfiguration },
    };
  }),
  withProps(
    ({
      aeroelastic,
      setAeroelastic,
      page,
      elements: pageElements,
      addElement,
      setMultiplePositions,
      insertNodes,
      removeElements,
      selectElement,
      elementLayer,
    }) => {
      const { shapes, selectedPrimaryShapes = [], cursor } = aeroelastic.currentScene;
      const elementLookup = new Map(pageElements.map(element => [element.id, element]));
      const recurseGroupTree = shapeId => {
        return [
          shapeId,
          ...flatten(
            shapes
              .filter(s => s.parent === shapeId && s.type !== 'annotation')
              .map(s => s.id)
              .map(recurseGroupTree)
          ),
        ];
      };

      const selectedPrimaryShapeObjects = selectedPrimaryShapes.map(id =>
        shapes.find(s => s.id === id)
      );
      const selectedPersistentPrimaryShapes = flatten(
        selectedPrimaryShapeObjects.map(shape =>
          shape.subtype === 'adHocGroup'
            ? shapes.filter(s => s.parent === shape.id && s.type !== 'annotation').map(s => s.id)
            : [shape.id]
        )
      );
      const selectedElementIds = flatten(selectedPersistentPrimaryShapes.map(recurseGroupTree));
      const selectedElements = [];
      const elements = shapes.map(shape => {
        let element = null;
        if (elementLookup.has(shape.id)) {
          element = elementLookup.get(shape.id);
          if (selectedElementIds.indexOf(shape.id) > -1) {
            selectedElements.push({ ...element, id: shape.id });
          }
        }
        // instead of just combining `element` with `shape`, we make property transfer explicit
        const result = {
          ...(element ? { ...shape, filter: element.filter } : shape),
          width: shape.a * 2,
          height: shape.b * 2,
        };
        return result;
      });
      return {
        elements,
        cursor,
        commit: (type, payload) => {
          setAeroelastic(state => {
            const currentScene = nextScene({
              ...state,
              primaryUpdate: { type, payload: { ...payload, uid: makeUid() } },
            });
            if (currentScene.gestureEnd) {
              // annotations don't need Redux persisting
              const primaryShapes = currentScene.shapes.filter(
                shape => shape.type !== 'annotation'
              );

              // persistent groups
              const persistableGroups = primaryShapes.filter(s => s.subtype === 'persistentGroup');

              // remove all group elements
              const elementsToRemove = pageElements.filter(
                e => e.position.type === 'group' && !persistableGroups.find(p => p.id === e.id)
              );
              if (elementsToRemove.length) {
                console.log('removing groups', elementsToRemove.map(e => e.id).join(', '));
                removeElements(page.id)(elementsToRemove.map(e => e.id));
              }

              // create all needed groups
              persistableGroups
                .filter(p => !pageElements.find(e => p.id === e.id))
                .forEach(g => {
                  const partialElement = {
                    id: g.id,
                    filter: undefined,
                    expression: 'shape fill="rgba(255,255,255,0)" | render',
                    position: {
                      ...shapeToElement(g),
                    },
                  };
                  console.log('adding group', g.id);
                  addElement(page.id)(partialElement);
                });

              // update the position of possibly changed elements
              updateGlobalPositions(
                positions => setMultiplePositions(positions.map(p => ({ ...p, pageId: page.id }))),
                currentScene,
                pageElements
              );
            }

            return {
              ...state,
              currentScene,
            };
          });
        },
        removeElements: () => {
          // currently, handle the removal of one element, exploiting multiselect subsequently
          if (selectedElementIds.length) {
            removeElements(page.id)(selectedElementIds);
          }
        },
        copyElements: () => {
          if (selectedElements.length) {
            setClipboardData({ selectedElements, rootShapes: selectedPrimaryShapes });
            notify.success('Copied element to clipboard');
          }
        },
        cutElements: () => {
          if (selectedElements.length) {
            setClipboardData({ selectedElements, rootShapes: selectedPrimaryShapes });
            removeElements(page.id)(selectedElementIds);
            notify.success('Copied element to clipboard');
          }
        },
        // TODO: This is slightly different from the duplicateElements function in sidebar/index.js. Should they be doing the same thing?
        // This should also be abstracted.
        duplicateElements: () => {
          const clonedElements = selectedElements && cloneSubgraphs(selectedElements);
          if (clonedElements) {
            insertNodes(page.id)(clonedElements);
            if (selectedPrimaryShapes.length) {
              if (selectedElements.length > 1) {
                // adHocGroup branch (currently, pasting will leave only the 1st element selected, rather than forming a
                // new adHocGroup - todo)
                selectElement(clonedElements[0].id);
              } else {
                // single element or single persistentGroup branch
                selectElement(
                  clonedElements[selectedElements.findIndex(s => s.id === selectedPrimaryShapes[0])]
                    .id
                );
              }
            }
          }
        },
        pasteElements: () => {
          const { selectedElements, rootShapes } = JSON.parse(getClipboardData()) || {};
          const clonedElements = selectedElements && cloneSubgraphs(selectedElements);
          if (clonedElements) {
            // first clone and persist the new node(s)
            insertNodes(page.id)(clonedElements);
            // then select the cloned node
            if (rootShapes.length) {
              if (selectedElements.length > 1) {
                // adHocGroup branch (currently, pasting will leave only the 1st element selected, rather than forming a
                // new adHocGroup - todo)
                selectElement(clonedElements[0].id);
              } else {
                // single element or single persistentGroup branch
                selectElement(
                  clonedElements[selectedElements.findIndex(s => s.id === rootShapes[0])].id
                );
              }
            }
          }
        },
        // TODO: Same as above. Abstract these out. This is the same code as in sidebar/index.js
        // Note: these layer actions only work when a single element is selected
        bringForward: () =>
          selectedElements.length === 1 && elementLayer(page.id, selectedElements[0], 1),
        bringToFront: () =>
          selectedElements.length === 1 && elementLayer(page.id, selectedElements[0], Infinity),
        sendBackward: () =>
          selectedElements.length === 1 && elementLayer(page.id, selectedElements[0], -1),
        sendToBack: () =>
          selectedElements.length === 1 && elementLayer(page.id, selectedElements[0], -Infinity),
      };
    }
  ), // Updates states; needs to have both local and global
  withHandlers(eventHandlers) // Captures user intent, needs to have reconciled state
)(Component);

WorkpadPage.propTypes = {
  page: PropTypes.shape({
    id: PropTypes.string.isRequired,
  }).isRequired,
};
