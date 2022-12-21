/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, FC, CSSProperties } from 'react';

interface Props {
  render: (element: HTMLElement) => void;
  style?: CSSProperties;
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
