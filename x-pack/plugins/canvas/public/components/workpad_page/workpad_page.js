/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Shortcuts } from 'react-shortcuts';
import { ElementWrapper } from '../element_wrapper';
import { AlignmentGuide } from '../alignment_guide';
import { HoverAnnotation } from '../hover_annotation';
import { RotationHandle } from '../rotation_handle';
import { BorderConnection } from '../border_connection';
import { BorderResizeHandle } from '../border_resize_handle';

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
    onKeyUp: PropTypes.func,
    onMouseDown: PropTypes.func,
    onMouseMove: PropTypes.func,
    onMouseUp: PropTypes.func,
    onAnimationEnd: PropTypes.func,
    resetHandler: PropTypes.func,
    copyElements: PropTypes.func,
    cutElements: PropTypes.func,
    pasteElements: PropTypes.func,
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
      onDoubleClick,
      onKeyDown,
      onKeyPress,
      onKeyUp,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onAnimationEnd,
      onWheel,
      copyElements,
      cutElements,
      pasteElements,
    } = this.props;

    const keyHandler = action => {
      switch (action) {
        case 'COPY':
          copyElements();
          break;
        case 'CUT':
          cutElements();
          break;
        case 'PASTE':
          pasteElements();
          break;
      }
    };

    return (
      <div
        key={page.id}
        id={page.id}
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
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseDown={onMouseDown}
        onKeyDown={onKeyDown}
        onKeyPress={onKeyPress}
        onKeyUp={onKeyUp}
        onDoubleClick={onDoubleClick}
        onAnimationEnd={onAnimationEnd}
        onWheel={onWheel}
        tabIndex={0} // needed to capture keyboard events; focusing is also needed but React apparently does so implicitly
      >
        {isEditable && (
          <Shortcuts
            name="ELEMENT"
            handler={keyHandler}
            targetNodeSelector={`#${page.id}`}
            global
          />
        )}
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
              };

              switch (element.subtype) {
                case 'alignmentGuide':
                  return <AlignmentGuide {...props} />;
                case 'hoverAnnotation':
                  return <HoverAnnotation {...props} />;
                case 'rotationHandle':
                  return <RotationHandle {...props} />;
                case 'resizeHandle':
                  return <BorderResizeHandle {...props} />;
                case 'resizeConnector':
                  return <BorderConnection {...props} />;
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
