/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

type ResizerMouseEvent = React.MouseEvent<HTMLDivElement, MouseEvent>;

export interface Props {
  onMouseDown: (eve: ResizerMouseEvent) => void;
}

/**
 * TODO: This component uses styling constants from public UI - should be removed, next iteration should incl. horizontal and vertical resizers.
 */
export function Resizer(props: Props) {
  return (
    <div {...props} className="conApp__resizer" data-test-subj="splitPanelResizer">
      &#xFE19;
    </div>
  );
}
