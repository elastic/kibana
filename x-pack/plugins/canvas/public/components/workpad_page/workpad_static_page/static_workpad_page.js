/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import { ElementWrapper } from '../../element_wrapper';
import { staticWorkpadPagePropTypes } from '../prop_types';
import { isGroupId } from '../positioning_utils';

export class StaticWorkpadPage extends PureComponent {
  static propTypes = staticWorkpadPagePropTypes;

  render() {
    const { pageId, pageStyle, className, animationStyle, elements, height, width } = this.props;

    return (
      <div
        key={pageId}
        id={pageId}
        data-test-subj="canvasWorkpadPage"
        className={`canvasPage kbn-resetFocusState canvasStaticPage ${className}`}
        data-shared-items-container
        style={{ ...pageStyle, ...animationStyle, height, width }}
      >
        {elements
          .filter((node) => !isGroupId(node.id))
          .map((element) => (
            <ElementWrapper key={element.id} element={element} />
          ))}
      </div>
    );
  }
}
