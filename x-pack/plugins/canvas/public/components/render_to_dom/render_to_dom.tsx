/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, FC } from 'react';
import CSS from 'csstype';

interface Props {
  render: (element: HTMLElement) => void;
  style?: CSS.Properties;
}

export const RenderToDom: FC<Props> = ({ render, style }) => {
  // https://reactjs.org/docs/hooks-faq.html#how-can-i-measure-a-dom-node
  const ref = useCallback(
    (node: HTMLDivElement) => {
      if (node !== null) {
        render(node);
      }
    },
    [render]
  );

  return <div className="render_to_dom" {...{ ref, style }} />;
};
