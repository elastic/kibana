/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import { ElementWrapper } from '../../element_wrapper';
import { AlignmentGuide } from '../../alignment_guide';
import { HoverAnnotation } from '../../hover_annotation';
import { TooltipAnnotation } from '../../tooltip_annotation';
import { RotationHandle } from '../../rotation_handle';
import { BorderConnection } from '../../border_connection';
import { BorderResizeHandle } from '../../border_resize_handle';
import { WorkpadShortcuts } from '../../workpad_shortcuts';
import { interactiveWorkpadPagePropTypes } from '../prop_types';

export class InteractiveWorkpadPage extends PureComponent {
  static propTypes = interactiveWorkpadPagePropTypes;

  componentWillUnmount() {
    this.props.resetHandler();
  }

  render() {
    const {
      pageId,
      pageStyle,
      className,
      elements,
      cursor = 'auto',
      height,
      width,
      onDoubleClick,
      onKeyDown,
      onMouseDown,
      onMouseLeave,
      onMouseMove,
      onMouseUp,
      onAnimationEnd,
      onWheel,
      selectedNodes,
      selectToplevelNodes,
      insertNodes,
      removeNodes,
      elementLayer,
      canvasOrigin,
      saveCanvasOrigin,
      commit,
    } = this.props;

    let shortcuts = null;

    const shortcutProps = {
      elementLayer,
      insertNodes,
      pageId,
      removeNodes,
      selectedNodes,
      selectToplevelNodes,
      commit,
    };
    shortcuts = <WorkpadShortcuts {...shortcutProps} />;

    return (
      <div
        key={pageId}
        id={pageId}
        ref={node => {
          if (!canvasOrigin && node && node.getBoundingClientRect) {
            saveCanvasOrigin(() => () => node.getBoundingClientRect());
          }
        }}
        data-test-subj="canvasWorkpadPage"
        className={`canvasPage kbn-resetFocusState canvasInteractivePage ${className}`}
        data-shared-items-container
        style={{ ...pageStyle, height, width, cursor }}
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
          .map(node => {
            if (node.type === 'annotation') {
              const props = {
                key: node.id,
                type: node.type,
                transformMatrix: node.transformMatrix,
                width: node.width,
                height: node.height,
                text: node.text,
              };

              switch (node.subtype) {
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
            } else if (node.type !== 'group') {
              return <ElementWrapper key={node.id} element={node} />;
            }
          })
          .filter(element => !!element)}
      </div>
    );
  }
}
