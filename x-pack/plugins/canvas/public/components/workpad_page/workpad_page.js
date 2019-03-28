/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { ElementWrapper } from '../element_wrapper';
import { AlignmentGuide } from '../alignment_guide';
import { HoverAnnotation } from '../hover_annotation';
import { TooltipAnnotation } from '../tooltip_annotation';
import { RotationHandle } from '../rotation_handle';
import { BorderConnection } from '../border_connection';
import { BorderResizeHandle } from '../border_resize_handle';
import { WorkpadShortcuts } from './workpad_shortcuts';

// NOTE: the data-shared-* attributes here are used for reporting
export class WorkpadPage extends PureComponent {
  static propTypes = {
    page: PropTypes.shape({
      id: PropTypes.string.isRequired,
      style: PropTypes.object,
    }).isRequired,
    className: PropTypes.string.isRequired,
    animationStyle: PropTypes.object.isRequired,
    elements: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
        width: PropTypes.number.isRequired,
        height: PropTypes.number.isRequired,
        type: PropTypes.string,
      })
    ).isRequired,
    cursor: PropTypes.string,
    height: PropTypes.number.isRequired,
    width: PropTypes.number.isRequired,
    isEditable: PropTypes.bool.isRequired,
    onDoubleClick: PropTypes.func,
    onKeyDown: PropTypes.func,
    onMouseDown: PropTypes.func,
    onMouseLeave: PropTypes.func,
    onMouseMove: PropTypes.func,
    onMouseUp: PropTypes.func,
    onAnimationEnd: PropTypes.func,
    resetHandler: PropTypes.func,
    copyElements: PropTypes.func,
    cutElements: PropTypes.func,
    duplicateElements: PropTypes.func,
    pasteElements: PropTypes.func,
    removeElements: PropTypes.func,
    bringForward: PropTypes.func,
    bringToFront: PropTypes.func,
    sendBackward: PropTypes.func,
    sendToBack: PropTypes.func,
    canvasOrigin: PropTypes.func,
    saveCanvasOrigin: PropTypes.func.isRequired,
  };

  componentWillUnmount() {
    this.props.resetHandler();
  }

  render() {
    const {
      page,
      className,
      animationStyle,
      elements,
      cursor = 'auto',
      height,
      width,
      isEditable,
      isSelected,
      onDoubleClick,
      onKeyDown,
      onMouseDown,
      onMouseLeave,
      onMouseMove,
      onMouseUp,
      onAnimationEnd,
      onWheel,
      selectedElementIds,
      selectedElements,
      selectedPrimaryShapes,
      selectElement,
      insertNodes,
      removeElements,
      elementLayer,
      groupElements,
      ungroupElements,
      forceUpdate,
      canvasOrigin,
      saveCanvasOrigin,
    } = this.props;

    let shortcuts = null;

    if (isEditable && isSelected) {
      const shortcutProps = {
        elementLayer,
        forceUpdate,
        groupElements,
        insertNodes,
        pageId: page.id,
        removeElements,
        selectedElementIds,
        selectedElements,
        selectedPrimaryShapes,
        selectElement,
        ungroupElements,
      };
      shortcuts = <WorkpadShortcuts {...shortcutProps} />;
    }

    return (
      <div
        key={page.id}
        id={page.id}
        ref={element => {
          if (!canvasOrigin && element && element.getBoundingClientRect) {
            saveCanvasOrigin(() => () => element.getBoundingClientRect());
          }
        }}
        data-test-subj="canvasWorkpadPage"
        className={`canvasPage ${className} ${isEditable ? 'canvasPage--isEditable' : ''}`}
        data-shared-items-container
        style={{
          ...page.style,
          ...animationStyle,
          height,
          width,
          cursor,
        }}
        onKeyDown={onKeyDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseDown={onMouseDown}
        onMouseLeave={onMouseLeave}
        onDoubleClick={onDoubleClick}
        onAnimationEnd={onAnimationEnd}
        onWheel={onWheel}
      >
        {shortcuts}
        {elements
          .map(element => {
            if (element.type === 'annotation') {
              if (!isEditable) {
                return;
              }
              const props = {
                key: element.id,
                type: element.type,
                transformMatrix: element.transformMatrix,
                width: element.width,
                height: element.height,
                text: element.text,
              };

              switch (element.subtype) {
                case 'alignmentGuide':
                  return <AlignmentGuide {...props} />;
                case 'adHocChildAnnotation': // now sharing aesthetics but may diverge in the future
                case 'hoverAnnotation': // fixme: with the upcoming TS work, use enumerative types here
                  return <HoverAnnotation {...props} />;
                case 'rotationHandle':
                  return <RotationHandle {...props} />;
                case 'resizeHandle':
                  return <BorderResizeHandle {...props} />;
                case 'resizeConnector':
                  return <BorderConnection {...props} />;
                case 'rotationTooltip':
                  return <TooltipAnnotation {...props} />;
                default:
                  return [];
              }
            } else if (element.type !== 'group') {
              return <ElementWrapper key={element.id} element={element} />;
            }
          })
          .filter(element => !!element)}
      </div>
    );
  }
}
